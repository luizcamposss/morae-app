namespace backend.Settings;

public class ResendSettings
{
    // Empty = e-mails are only written to the log (development).
    public string ApiKey { get; set; } = string.Empty;
    public string From { get; set; } = "MORAÊ <nao-responda@morae.synergylab.tech>";
}
