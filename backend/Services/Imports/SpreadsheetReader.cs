using System.Globalization;
using System.IO.Compression;
using System.Security;
using System.Text;
using System.Xml.Linq;
using backend.Exceptions;

namespace backend.Services.Imports;

// Reads the first sheet of a CSV or XLSX file into plain text cells, without any external library.
// XLSX is a ZIP of XML files: only the workbook, its relationships, the shared strings and the first
// worksheet are read, each with a size cap so a "zip bomb" cannot exhaust memory.
public static class SpreadsheetReader
{
    public record Row(int Line, string[] Cells);
    public record Table(string[] Headers, List<Row> Rows);

    private const long MaxXmlEntryBytes = 30 * 1024 * 1024;

    private static readonly XNamespace SheetNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static readonly XNamespace RelNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static readonly XNamespace PackageRelNs = "http://schemas.openxmlformats.org/package/2006/relationships";

    public static Table Read(Stream content, bool isXlsx, int maxRows)
    {
        var lines = isXlsx ? ReadXlsx(content) : ReadCsv(content);

        // The header is the first non-empty line; blank lines are skipped everywhere.
        var nonEmpty = lines.Where(row => row.Cells.Any(cell => !string.IsNullOrWhiteSpace(cell))).ToList();

        if (nonEmpty.Count == 0)
            throw new BadRequestException("A planilha está vazia.");

        var rows = nonEmpty.Skip(1).ToList();

        if (rows.Count == 0)
            throw new BadRequestException("A planilha só tem o cabeçalho. Preencha ao menos uma linha.");

        if (rows.Count > maxRows)
            throw new BadRequestException($"A planilha tem {rows.Count} linhas. O limite é {maxRows} por envio: divida o arquivo.");

        return new Table(nonEmpty[0].Cells.Select(cell => cell.Trim()).ToArray(), rows);
    }

    // ---- CSV ----

    private static List<Row> ReadCsv(Stream content)
    {
        var text = DecodeText(content);
        var firstLine = text.Split('\n', 2)[0];

        // Excel in Portuguese saves CSV with ";"; other tools use "," or tab.
        var delimiter = new[] { ';', ',', '\t' }
            .OrderByDescending(candidate => firstLine.Count(character => character == candidate))
            .First();

        var rows = new List<Row>();
        var cells = new List<string>();
        var cell = new StringBuilder();
        var inQuotes = false;
        var line = 1;
        var rowLine = 1;

        for (var index = 0; index < text.Length; index++)
        {
            var character = text[index];

            if (inQuotes)
            {
                if (character == '"' && index + 1 < text.Length && text[index + 1] == '"')
                {
                    cell.Append('"');
                    index++;
                }
                else if (character == '"')
                {
                    inQuotes = false;
                }
                else
                {
                    if (character == '\n')
                        line++;

                    cell.Append(character);
                }

                continue;
            }

            if (character == '"')
            {
                inQuotes = true;
            }
            else if (character == delimiter)
            {
                cells.Add(cell.ToString());
                cell.Clear();
            }
            else if (character == '\n')
            {
                cells.Add(cell.ToString().TrimEnd('\r'));
                cell.Clear();
                rows.Add(new Row(rowLine, cells.ToArray()));
                cells.Clear();
                line++;
                rowLine = line;
            }
            else
            {
                cell.Append(character);
            }
        }

        if (cell.Length > 0 || cells.Count > 0)
        {
            cells.Add(cell.ToString().TrimEnd('\r'));
            rows.Add(new Row(rowLine, cells.ToArray()));
        }

        return rows;
    }

    // UTF-8 (with or without BOM) first; older Excel versions save CSV as Windows-1252/Latin-1.
    private static string DecodeText(Stream content)
    {
        using var memory = new MemoryStream();
        content.CopyTo(memory);
        var bytes = memory.ToArray();

        if (bytes.AsSpan().IndexOf((byte)0) >= 0)
            throw new BadRequestException("O arquivo não parece ser uma planilha CSV ou Excel (.xlsx).");

        try
        {
            var text = new UTF8Encoding(false, true).GetString(bytes);
            return text.TrimStart('﻿');
        }
        catch (DecoderFallbackException)
        {
            return Encoding.Latin1.GetString(bytes);
        }
    }

    // ---- XLSX ----

    private static List<Row> ReadXlsx(Stream content)
    {
        try
        {
            using var zip = new ZipArchive(content, ZipArchiveMode.Read, leaveOpen: true);

            var sharedStrings = LoadSharedStrings(zip);
            var sheet = LoadXml(zip, FindFirstSheetPath(zip))
                ?? throw new BadRequestException("Não foi possível ler a primeira aba da planilha.");

            var rows = new List<Row>();

            foreach (var rowElement in sheet.Descendants(SheetNs + "row"))
            {
                var line = int.TryParse(rowElement.Attribute("r")?.Value, out var rowNumber) ? rowNumber : rows.Count + 1;
                var cells = new List<string>();

                foreach (var cellElement in rowElement.Elements(SheetNs + "c"))
                {
                    var column = ColumnIndex(cellElement.Attribute("r")?.Value) ?? cells.Count;

                    // Columns can only grow up to a sane width; anything else is ignored.
                    if (column > 200)
                        continue;

                    while (cells.Count < column)
                        cells.Add(string.Empty);

                    var value = ReadCellValue(cellElement, sharedStrings);

                    if (cells.Count == column)
                        cells.Add(value);
                    else
                        cells[column] = value;
                }

                rows.Add(new Row(line, cells.ToArray()));
            }

            return rows;
        }
        catch (Exception exception) when (exception is InvalidDataException or System.Xml.XmlException)
        {
            throw new BadRequestException("Não foi possível ler o arquivo Excel. Salve de novo como .xlsx ou .csv.");
        }
    }

    private static string FindFirstSheetPath(ZipArchive zip)
    {
        const string fallback = "xl/worksheets/sheet1.xml";

        var workbook = LoadXml(zip, "xl/workbook.xml");
        var relationships = LoadXml(zip, "xl/_rels/workbook.xml.rels");
        var relationshipId = workbook?.Descendants(SheetNs + "sheet").FirstOrDefault()?.Attribute(RelNs + "id")?.Value;

        var target = relationships?
            .Descendants(PackageRelNs + "Relationship")
            .FirstOrDefault(relationship => relationship.Attribute("Id")?.Value == relationshipId)?
            .Attribute("Target")?.Value;

        if (string.IsNullOrWhiteSpace(target))
            return fallback;

        return target.StartsWith('/') ? target.TrimStart('/') : "xl/" + target;
    }

    private static List<string> LoadSharedStrings(ZipArchive zip)
    {
        var document = LoadXml(zip, "xl/sharedStrings.xml");

        if (document is null)
            return [];

        // Rich text keeps pieces in several <t> elements inside <r> runs.
        return document.Root!
            .Elements(SheetNs + "si")
            .Select(item => string.Concat(item.Descendants(SheetNs + "t")
                .Where(text => text.Parent?.Name != SheetNs + "rPh")
                .Select(text => text.Value)))
            .ToList();
    }

    private static XDocument? LoadXml(ZipArchive zip, string path)
    {
        var entry = zip.GetEntry(path);

        if (entry is null)
            return null;

        if (entry.Length > MaxXmlEntryBytes)
            throw new BadRequestException("A planilha é grande demais para importar de uma vez: divida o arquivo.");

        using var stream = entry.Open();

        // DTDs are refused, so external entities cannot be resolved.
        var settings = new System.Xml.XmlReaderSettings { DtdProcessing = System.Xml.DtdProcessing.Prohibit, XmlResolver = null };
        using var reader = System.Xml.XmlReader.Create(stream, settings);

        return XDocument.Load(reader);
    }

    private static string ReadCellValue(XElement cell, List<string> sharedStrings)
    {
        var type = cell.Attribute("t")?.Value;

        if (type == "inlineStr")
            return string.Concat(cell.Descendants(SheetNs + "t").Select(text => text.Value));

        var value = cell.Element(SheetNs + "v")?.Value ?? string.Empty;

        if (type == "s")
        {
            return int.TryParse(value, out var index) && index >= 0 && index < sharedStrings.Count
                ? sharedStrings[index]
                : string.Empty;
        }

        if (type == "b")
            return value == "1" ? "sim" : "não";

        return value;
    }

    // "C12" → 2 (zero-based column).
    private static int? ColumnIndex(string? reference)
    {
        if (string.IsNullOrEmpty(reference))
            return null;

        var column = 0;
        var letters = 0;

        foreach (var character in reference)
        {
            if (character is < 'A' or > 'Z')
                break;

            column = column * 26 + (character - 'A' + 1);
            letters++;
        }

        return letters == 0 ? null : column - 1;
    }

    // ---- Template ----

    public static byte[] BuildCsv(IReadOnlyList<string[]> rows)
    {
        var builder = new StringBuilder();

        foreach (var row in rows)
        {
            builder.AppendJoin(';', row.Select(cell =>
                cell.IndexOfAny([';', '"', '\n']) >= 0 ? $"\"{cell.Replace("\"", "\"\"")}\"" : cell));
            builder.Append("\r\n");
        }

        // BOM so Excel opens the accents correctly.
        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(builder.ToString())).ToArray();
    }

    // Minimal one-sheet workbook with inline strings (no styles needed).
    public static byte[] BuildXlsx(IReadOnlyList<string[]> rows, string sheetName)
    {
        using var memory = new MemoryStream();

        using (var zip = new ZipArchive(memory, ZipArchiveMode.Create, leaveOpen: true))
        {
            void Add(string path, string xml)
            {
                using var writer = new StreamWriter(zip.CreateEntry(path).Open(), new UTF8Encoding(false));
                writer.Write(xml);
            }

            Add("[Content_Types].xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
                "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
                "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>" +
                "</Types>");

            Add("_rels/.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>" +
                "</Relationships>");

            Add("xl/workbook.xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">" +
                $"<sheets><sheet name=\"{SecurityElement.Escape(sheetName)}\" sheetId=\"1\" r:id=\"rId1\"/></sheets>" +
                "</workbook>");

            Add("xl/_rels/workbook.xml.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>" +
                "</Relationships>");

            var sheet = new StringBuilder(
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>");

            for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
            {
                sheet.Append(CultureInfo.InvariantCulture, $"<row r=\"{rowIndex + 1}\">");

                foreach (var cell in rows[rowIndex])
                    sheet.Append("<c t=\"inlineStr\"><is><t>").Append(SecurityElement.Escape(cell)).Append("</t></is></c>");

                sheet.Append("</row>");
            }

            sheet.Append("</sheetData></worksheet>");
            Add("xl/worksheets/sheet1.xml", sheet.ToString());
        }

        return memory.ToArray();
    }
}
