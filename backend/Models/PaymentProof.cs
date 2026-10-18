using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// Receipt of a Pix transfer sent by the payer when the condominium has no Mercado Pago.
// The management checks it and settles the charge manually (Accepted) or rejects it with a reason.
// The file itself lives in IFileStorage.
public class PaymentProof
{
    [Key]
    public int Id { get; set; }

    public int ChargeId { get; set; }
    public Charge Charge { get; set; } = null!;

    public int UploadedByUserId { get; set; }
    public ApplicationUser UploadedByUser { get; set; } = null!;

    [Required]
    [StringLength(200)]
    public string FileKey { get; set; } = string.Empty;

    [Required]
    [StringLength(160)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Note { get; set; }

    public PaymentProofStatus Status { get; set; } = PaymentProofStatus.Pending;

    [StringLength(500)]
    public string? RejectionReason { get; set; }

    public int? ReviewedByUserId { get; set; }
    public ApplicationUser? ReviewedByUser { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
