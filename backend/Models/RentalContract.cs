using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// A unit rented to a tenant. Every month the hourly job puts the rent (and the condominium fee,
// when included) in the tenant's draft monthly bill; water, light and gas come from the readings.
public class RentalContract
{
    [Key]
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    // Must be linked to the unit; the monthly bill goes to this person only.
    public int TenantPersonId { get; set; }
    public Person TenantPerson { get; set; } = null!;

    // Null = the condominium (or building owner, as Admin) receives the rent; set = the unit owner,
    // who created the contract in "Meus aluguéis" and receives it in their own account.
    public int? ReceiverPersonId { get; set; }
    public Person? ReceiverPerson { get; set; }

    public decimal MonthlyRent { get; set; }

    [Range(1, 31)]
    public int DueDay { get; set; } = 10;

    public DateOnly StartDate { get; set; }
    // Null = open-ended. The last month billed is the one of the end date.
    public DateOnly? EndDate { get; set; }

    // Who pays the unit's condominium bills while the contract is active (#208).
    public CondominiumBillsPayer CondominiumBillsPaidBy { get; set; } = CondominiumBillsPayer.Tenant;

    // What else the tenant pays in the same bill.
    public bool IncludesWater { get; set; }
    public bool IncludesElectricity { get; set; }
    public bool IncludesGas { get; set; }
    public bool IncludesCondominiumFee { get; set; }
    public decimal? CondominiumFeeAmount { get; set; }

    public RentAdjustmentIndex AdjustmentIndex { get; set; } = RentAdjustmentIndex.Ipca;
    // Null when there is no adjustment.
    public DateOnly? NextAdjustmentDate { get; set; }
    // Keeps the 30-days reminder from going out twice for the same date.
    public DateOnly? AdjustmentReminderSentFor { get; set; }

    public RentalContractStatus Status { get; set; } = RentalContractStatus.Active;

    // Last month (first day) whose rent is already in a bill: generation never repeats a month.
    public DateOnly? LastBilledMonth { get; set; }

    [StringLength(255)]
    public string? EndReason { get; set; }
    public DateTime? EndedAt { get; set; }

    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RentalContractValueChange> ValueChanges { get; set; } = [];
}

// History of the rent: the first value and every adjustment.
public class RentalContractValueChange
{
    [Key]
    public int Id { get; set; }

    public int RentalContractId { get; set; }
    public RentalContract RentalContract { get; set; } = null!;

    public decimal? PreviousValue { get; set; }
    public decimal NewValue { get; set; }
    // First month (first day) billed with the new value.
    public DateOnly EffectiveFrom { get; set; }

    public int ChangedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
