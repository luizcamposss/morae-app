using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// One line of a monthly bill (a charge with category MonthlyBill), e.g. "Água (18 m³)".
// The charge's Value is always the sum of its items.
public class ChargeItem
{
    [Key]
    public int Id { get; set; }

    public int ChargeId { get; set; }
    public Charge Charge { get; set; } = null!;

    public ChargeCategory Category { get; set; } = ChargeCategory.Other;

    [Required]
    [StringLength(150)]
    public string Description { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // Set when a fixed monthly charge (RecurringCharge) put it there: never twice in the same month.
    public int? RecurringChargeId { get; set; }

    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
