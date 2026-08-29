namespace backend.DTOs.MercadoPago;

public class MercadoPagoCheckoutResponseDto
{
    public string PreferenceId { get; set; } = string.Empty;
    public string CheckoutUrl { get; set; } = string.Empty;
    public string InitPoint { get; set; } = string.Empty;
    public string SandboxInitPoint { get; set; } = string.Empty;
    public string ExternalReference { get; set; } = string.Empty;
}
