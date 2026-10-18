using backend.Enums;

namespace backend.DTOs.PaymentProof;

public class PaymentProofResponseDto
{
    public int Id { get; set; }
    public int ChargeId { get; set; }
    public int UploadedByUserId { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string? Note { get; set; }
    public PaymentProofStatus Status { get; set; }
    public string? RejectionReason { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
