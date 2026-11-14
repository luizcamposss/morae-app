using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// A debt agreement: overdue charges of one unit renegotiated into an optional down payment plus
// monthly installments. The original charges stay (status Renegotiated) and the installments
// are new charges of category Agreement (Charge.AgreementId).
public class Agreement
{
    [Key]
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    // Null = the installments go to everyone linked to the unit.
    public int? RecipientPersonId { get; set; }
    public Person? RecipientPerson { get; set; }

    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;

    public AgreementStatus Status { get; set; } = AgreementStatus.Active;

    // Snapshot on the day of the agreement: original values and their fine/interest as of that day.
    public decimal OriginalAmount { get; set; }
    public decimal FineAmount { get; set; }
    public decimal InterestAmount { get; set; }

    // Discount on the fine + interest only (never on the original values).
    public AgreementDiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }

    // OriginalAmount + FineAmount + InterestAmount - DiscountAmount.
    public decimal TotalAmount { get; set; }

    public decimal? DownPayment { get; set; }
    public int InstallmentCount { get; set; }
    public int InstallmentDueDay { get; set; }

    // An installment unpaid this many days after its due date breaks the agreement (hourly job).
    public int BreakAfterDaysLate { get; set; } = 30;

    [StringLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }

    [StringLength(255)]
    public string? EndReason { get; set; }

    public List<AgreementCharge> OriginalCharges { get; set; } = [];
    public List<Charge> Installments { get; set; } = [];
}

// An original charge renegotiated in an agreement, with its amounts on the day of the agreement.
// A separate table (not a column on Charge) so a charge renegotiated again after a broken agreement
// keeps both agreements in its history.
public class AgreementCharge
{
    public int AgreementId { get; set; }
    public Agreement Agreement { get; set; } = null!;

    public int ChargeId { get; set; }
    public Charge Charge { get; set; } = null!;

    public decimal Value { get; set; }
    public decimal FineAmount { get; set; }
    public decimal InterestAmount { get; set; }
}
