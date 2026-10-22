namespace backend.Settings;

public class CommercialSettings
{
    // Commercial WhatsApp of the platform owner (digits only, with country code, e.g. 5511999990000).
    // Shown by the landing page and the login. Empty = the WhatsApp buttons are hidden.
    public string WhatsAppNumber { get; set; } = string.Empty;
}
