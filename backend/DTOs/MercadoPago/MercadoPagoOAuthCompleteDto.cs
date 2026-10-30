namespace backend.DTOs.MercadoPago;

public class MercadoPagoOAuthCompleteDto
{
    public string Code { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
}
