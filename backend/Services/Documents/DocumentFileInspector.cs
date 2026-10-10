using System.IO.Compression;

namespace backend.Services.Documents;

// Identifies the file type from its content (the first bytes), never from the name or the
// browser's content type: a renamed executable is rejected even if it is called ".pdf".
public static class DocumentFileInspector
{
    public record DetectedType(string ContentType, string Extension, string Label);

    private static readonly byte[] PdfSignature = "%PDF-"u8.ToArray();
    private static readonly byte[] JpegSignature = [0xFF, 0xD8, 0xFF];
    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    private static readonly byte[] ZipSignature = [0x50, 0x4B, 0x03, 0x04];

    public static DetectedType? Detect(Stream content)
    {
        var header = new byte[8];
        content.Position = 0;
        var read = content.Read(header, 0, header.Length);
        content.Position = 0;

        if (StartsWith(header, read, PdfSignature))
            return new DetectedType("application/pdf", ".pdf", "PDF");

        if (StartsWith(header, read, JpegSignature))
            return new DetectedType("image/jpeg", ".jpg", "JPG");

        if (StartsWith(header, read, PngSignature))
            return new DetectedType("image/png", ".png", "PNG");

        if (StartsWith(header, read, ZipSignature))
            return DetectOfficeDocument(content);

        return null;
    }

    // .docx and .xlsx are ZIP files with a known structure; any other ZIP is rejected.
    private static DetectedType? DetectOfficeDocument(Stream content)
    {
        try
        {
            using var zip = new ZipArchive(content, ZipArchiveMode.Read, leaveOpen: true);

            var hasContentTypes = zip.GetEntry("[Content_Types].xml") is not null;

            if (hasContentTypes && zip.GetEntry("word/document.xml") is not null)
            {
                return new DetectedType(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx", "Word");
            }

            if (hasContentTypes && zip.GetEntry("xl/workbook.xml") is not null)
            {
                return new DetectedType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx", "Excel");
            }

            return null;
        }
        catch (InvalidDataException)
        {
            return null;
        }
        finally
        {
            content.Position = 0;
        }
    }

    private static bool StartsWith(byte[] header, int read, byte[] signature)
    {
        return read >= signature.Length && header.AsSpan(0, signature.Length).SequenceEqual(signature);
    }
}
