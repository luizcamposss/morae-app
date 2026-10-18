namespace backend.DTOs.Import;

// What happens to one part of a row: a new record (also when it repeats an earlier row of the file)
// or one that already exists in the system and is reused.
public static class ImportAction
{
    public const string Create = "create";
    public const string Existing = "existing";
}

public class ImportCountDto
{
    public int Created { get; set; }
    public int Skipped { get; set; }
}

public class ImportSummaryDto
{
    public ImportCountDto Buildings { get; set; } = new();
    public ImportCountDto Units { get; set; } = new();
    public ImportCountDto Persons { get; set; } = new();
    public ImportCountDto Links { get; set; } = new();
    public ImportCountDto Charges { get; set; } = new();
}

public class ImportRowDto
{
    public int Line { get; set; }
    public List<string> Errors { get; set; } = [];
    public List<string> Warnings { get; set; } = [];

    public string Building { get; set; } = string.Empty;
    public string? BuildingAction { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string? UnitTypeLabel { get; set; }
    public string? UnitAction { get; set; }

    public string? PersonName { get; set; }
    public string? CPF { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? PersonAction { get; set; }

    public string? RelationshipLabel { get; set; }
    public string? LinkAction { get; set; }

    public decimal? ChargeValue { get; set; }
    public DateOnly? ChargeDueDate { get; set; }
    public string? ChargeDescription { get; set; }
    public string? ChargeAction { get; set; }
}

public class ImportPreviewDto
{
    public string FileName { get; set; } = string.Empty;
    public int TotalRows { get; set; }
    public int ErrorRows { get; set; }
    public bool CanConfirm { get; set; }
    public List<string> RecognizedColumns { get; set; } = [];
    public List<string> IgnoredColumns { get; set; } = [];
    public ImportSummaryDto Summary { get; set; } = new();
    public List<ImportRowDto> Rows { get; set; } = [];
}

public class ImportResultDto
{
    public int TotalRows { get; set; }
    public ImportSummaryDto Summary { get; set; } = new();
}
