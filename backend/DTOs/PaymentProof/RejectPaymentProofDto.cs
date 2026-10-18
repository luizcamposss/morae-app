using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.PaymentProof;

public class RejectPaymentProofDto
{
    [Required(ErrorMessage = "Informe o motivo da recusa.")]
    [StringLength(500, ErrorMessage = "O motivo pode ter no máximo 500 caracteres.")]
    public string Reason { get; set; } = string.Empty;
}
