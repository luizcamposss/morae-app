using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs.Agreement;

public class CreateAgreementDto
{
    [Required]
    public int UnitId { get; set; }

    // Null = the installments go to everyone linked to the unit.
    public int? RecipientPersonId { get; set; }

    // Overdue charges of the unit to renegotiate.
    [Required]
    [MinLength(1, ErrorMessage = "Escolha ao menos uma cobrança atrasada.")]
    public List<int> ChargeIds { get; set; } = [];

    // Discount on the fine + interest of the chosen charges: a percent (0-100) or an amount in R$.
    public AgreementDiscountType DiscountType { get; set; } = AgreementDiscountType.None;
    public decimal DiscountValue { get; set; }

    // Optional down payment, due on DownPaymentDueDate.
    public decimal? DownPayment { get; set; }
    public DateTime? DownPaymentDueDate { get; set; }

    [Range(1, 36, ErrorMessage = "O acordo pode ter de 1 a 36 parcelas.")]
    public int InstallmentCount { get; set; }

    // Due date of installment 1; the next ones fall on the same day of the following months.
    [Required]
    public DateTime FirstInstallmentDueDate { get; set; }

    [Range(1, 180, ErrorMessage = "A quebra do acordo precisa ficar entre 1 e 180 dias de atraso.")]
    public int BreakAfterDaysLate { get; set; } = 30;

    [StringLength(500)]
    public string? Notes { get; set; }
}

public class CancelAgreementDto
{
    [StringLength(255)]
    public string? Reason { get; set; }
}

public class AgreementResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int UnitId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public int? RecipientPersonId { get; set; }
    public string? RecipientName { get; set; }
    public AgreementStatus Status { get; set; }

    public decimal OriginalAmount { get; set; }
    public decimal FineAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public AgreementDiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal? DownPayment { get; set; }
    public int InstallmentCount { get; set; }
    public int InstallmentDueDay { get; set; }
    public int BreakAfterDaysLate { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? EndReason { get; set; }

    // Progress over every installment (down payment included).
    public int PaidCount { get; set; }
    public int TotalCount { get; set; }
    public decimal PaidAmount { get; set; }

    public List<AgreementOriginalChargeDto> OriginalCharges { get; set; } = [];
    public List<AgreementInstallmentDto> Installments { get; set; } = [];
}

public class AgreementOriginalChargeDto
{
    public int ChargeId { get; set; }
    public string Description { get; set; } = string.Empty;
    public ChargeCategory Category { get; set; }
    public DateTime DueDate { get; set; }
    public decimal Value { get; set; }
    public decimal FineAmount { get; set; }
    public decimal InterestAmount { get; set; }
    // Current status of the charge (Renegotiated while the agreement is active).
    public ChargeStatus Status { get; set; }
}

public class AgreementInstallmentDto
{
    public int ChargeId { get; set; }
    // 0 = down payment.
    public int Number { get; set; }
    public decimal Value { get; set; }
    public DateTime DueDate { get; set; }
    public ChargeStatus Status { get; set; }
    public int DaysLate { get; set; }
    public decimal UpdatedAmount { get; set; }
}
