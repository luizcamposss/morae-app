using backend.Enums;

namespace backend.DTOs.LandingContact;

// Sent by the landing page form. Validated in LandingContactService (Portuguese messages).
public class CreateLandingContactDto
{
    public string Name { get; set; } = string.Empty;

    // Any formatting is accepted ("+55 (11) 99999-9999"); only the digits are kept.
    public string WhatsApp { get; set; } = string.Empty;

    public int UnitCount { get; set; }

    public LandingContactProfileType Profile { get; set; }

    // "inadimplencia", "avisos", "sistema", "assembleia" or "migrar". Optional.
    public string? Pain { get; set; }
}
