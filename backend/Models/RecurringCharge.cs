using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// A monthly charge the scheduled job generates for every unit (of the condominium, of one
// building or a single unit) until the Admin pauses or ends it.
public class RecurringCharge
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    // Null = every building of the condominium.
    public int? BuildingId { get; set; }
    public Building? Building { get; set; }

    // Set = a recurrence for this unit only (BuildingId is then the unit's building).
    public int? UnitId { get; set; }
    public Unit? Unit { get; set; }

    // Only with UnitId: the person who gets the charges (null = everyone linked to the unit).
    public int? RecipientPersonId { get; set; }
    public Person? RecipientPerson { get; set; }

    [Required]
    public ChargeCategory Category { get; set; } = ChargeCategory.CondominiumFee;

    [Required]
    [StringLength(255)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public decimal Value { get; set; }

    // Null = the condominium's BillingDueDay at generation time.
    [Range(1, 31)]
    public int? DueDay { get; set; }

    [Required]
    public RecurringChargeStatus Status { get; set; } = RecurringChargeStatus.Active;

    [Required]
    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;

    public ICollection<RecurringChargeUnitValue> UnitValues { get; set; } = [];

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
}

// A unit that pays a different value than the recurring charge's default.
public class RecurringChargeUnitValue
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int RecurringChargeId { get; set; }
    public RecurringCharge RecurringCharge { get; set; } = null!;

    [Required]
    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    [Required]
    public decimal Value { get; set; }
}
