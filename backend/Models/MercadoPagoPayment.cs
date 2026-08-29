using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class MercadoPagoPayment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChargeId { get; set; }
    public Charge Charge { get; set; } = null!;

    [Required]
    public int MercadoPagoAccountId { get; set; }
    public MercadoPagoAccount MercadoPagoAccount { get; set; } = null!;

    public int? PaymentId { get; set; }
    public Payment? Payment { get; set; }

    [Required]
    [StringLength(120)]
    public string PreferenceId { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string ExternalReference { get; set; } = string.Empty;

    public long? MercadoPagoPaymentId { get; set; }

    [Required]
    [StringLength(50)]
    public string Status { get; set; } = "created";

    [StringLength(120)]
    public string? StatusDetail { get; set; }

    [StringLength(80)]
    public string? PaymentMethodId { get; set; }

    [StringLength(80)]
    public string? PaymentTypeId { get; set; }

    public decimal Amount { get; set; }

    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
