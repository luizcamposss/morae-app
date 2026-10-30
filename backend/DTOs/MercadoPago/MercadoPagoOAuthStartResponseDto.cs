namespace backend.DTOs.MercadoPago;

public class MercadoPagoOAuthStartResponseDto
{
    public string AuthorizationUrl { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}