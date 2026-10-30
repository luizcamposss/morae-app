namespace backend.Settings;

public class ResendSettings
{
    // Empty = e-mails are only written to the log (development).
    public string ApiKey { get; set; } = string.Empty;
    public string From { get; set; } = "MORAÊ <nao-responda@morae.synergylab.tech>";

    // Tests only: when set, every e-mail goes to this address instead (subject shows the real recipient).
    // Leave empty in production.
    public string TestRecipient { get; set; } = string.Empty;
}
