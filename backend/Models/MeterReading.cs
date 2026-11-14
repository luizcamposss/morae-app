using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// Price of water, light or gas in a condominium with individual meters.
public class UtilityRate
{
    [Key]
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    // Water, Electricity or Gas.
    public ChargeCategory Category { get; set; }

    public bool Enabled { get; set; } = true;
    // R$ per m³ (water, gas) or per kWh (light).
    public decimal PricePerUnit { get; set; }
    // The least a unit pays in a month, even with low consumption (0 = none).
    public decimal MinimumCharge { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// A unit's meter reading of one month. The amount goes as an item into the monthly bill
// (the tenant's, when the rental contract includes it; otherwise the unit's).
public class MeterReading
{
    [Key]
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    public ChargeCategory Category { get; set; }

    // First day of the month the reading bills.
    public DateOnly Month { get; set; }

    public decimal PreviousReading { get; set; }
    public decimal CurrentReading { get; set; }
    public decimal Consumption { get; set; }
    public decimal Amount { get; set; }

    // The bill item created from this reading (replaced when the reading is corrected).
    public int? ChargeItemId { get; set; }

    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
