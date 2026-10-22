using backend.Enums;

namespace backend.DTOs.LandingContact;

public class LandingContactResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    // Digits only, with the country code.
    public string WhatsApp { get; set; } = string.Empty;
    public int UnitCount { get; set; }
    public LandingContactProfileType Profile { get; set; }
    // Landing pain id, or null.
    public string? Pain { get; set; }
    // The pain in words ("Inadimplência"), or null.
    public string? PainLabel { get; set; }
    public LandingContactStatus Status { get; set; }
    // Ready https://wa.me link with a first message, the same one sent in the Master's e-mail.
    public string WhatsAppUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
