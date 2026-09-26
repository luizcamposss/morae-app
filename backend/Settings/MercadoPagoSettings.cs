namespace backend.Settings;

public class MercadoPagoSettings
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string Environment { get; set; } = "Sandbox";
    public string OAuthRedirectUri { get; set; } = string.Empty;
    public string WebhookUrl { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public int WebhookSignatureToleranceMinutes { get; set; } = 5;
}
