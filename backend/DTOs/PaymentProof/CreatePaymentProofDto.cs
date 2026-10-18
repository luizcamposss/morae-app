using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.PaymentProof;

// Sent as multipart/form-data together with the file (PDF, JPG or PNG).
public class CreatePaymentProofDto
{
    public IFormFile? File { get; set; }

    [StringLength(500, ErrorMessage = "A observação pode ter no máximo 500 caracteres.")]
    public string? Note { get; set; }
}
