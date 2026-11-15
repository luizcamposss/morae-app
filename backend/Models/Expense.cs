using System.ComponentModel.DataAnnotations;

namespace backend.Models;

// Money the condominium already spent (a paid bill). Goes out in the monthly balance.
public class Expense
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int ExpenseCategoryId { get; set; }
    public ExpenseCategory Category { get; set; } = null!;

    // Null = the whole condominium.
    public int? BuildingId { get; set; }
    public Building? Building { get; set; }

    public decimal Amount { get; set; }

    // São Paulo calendar day the bill was paid; decides the month of the balance.
    public DateOnly PaidOn { get; set; }

    [StringLength(150)]
    public string? Supplier { get; set; }

    [StringLength(255)]
    public string? Description { get; set; }

    // Optional receipt (invoice, bank slip, transfer) in the file storage.
    [StringLength(200)]
    public string? ReceiptFileName { get; set; }

    [StringLength(100)]
    public string? ReceiptContentType { get; set; }

    public long? ReceiptSizeBytes { get; set; }

    [StringLength(200)]
    public string? ReceiptStorageKey { get; set; }

    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
