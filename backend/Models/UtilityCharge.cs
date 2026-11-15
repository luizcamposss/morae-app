using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// Water, light or gas of a unit in one month, typed in by the management in R$ (#209: no meter
// readings). It goes as an item into the monthly bill of whoever pays the unit's condominium bills.
public class UtilityCharge
{
    [Key]
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    // Water, Electricity or Gas.
    public ChargeCategory Category { get; set; }

    // First day of the month it bills.
    public DateOnly Month { get; set; }

    public decimal Amount { get; set; }

    // The bill item it created (replaced when the amount is corrected while the bill is a draft).
    public int? ChargeItemId { get; set; }

    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
