namespace backend.DTOs.Expense;

// Sent as multipart/form-data; the receipt is optional.
public class SaveExpenseDto
{
    public int CategoryId { get; set; }

    // Text with a dot as decimal separator ("1234.56"): form values are read with the server's
    // culture, so a decimal field would depend on where the API runs.
    public string? Amount { get; set; }

    public DateOnly? PaidOn { get; set; }
    public string? Supplier { get; set; }
    public int? BuildingId { get; set; }
    public string? Description { get; set; }
    public IFormFile? File { get; set; }

    // On update: true removes the current receipt (ignored when a new file is sent).
    public bool RemoveReceipt { get; set; }
}

public class ExpenseResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? CategoryIconKey { get; set; }
    public int? BuildingId { get; set; }
    public string? BuildingName { get; set; }
    public decimal Amount { get; set; }
    public DateOnly PaidOn { get; set; }
    public string? Supplier { get; set; }
    public string? Description { get; set; }
    public bool HasReceipt { get; set; }
    public string? ReceiptFileName { get; set; }
    public long? ReceiptSizeBytes { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public record ExpenseReceiptDownload(Stream Content, string ContentType, string FileName);
