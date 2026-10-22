namespace backend.DTOs.Public;

public class CommercialContactResponseDto
{
    // Digits only, with country code. Null when no number is configured.
    public string? WhatsAppNumber { get; set; }
}
