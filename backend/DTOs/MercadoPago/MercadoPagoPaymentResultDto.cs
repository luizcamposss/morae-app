using backend.Enums;

namespace backend.DTOs.MercadoPago;

public class MercadoPagoPaymentResultDto
{
    public long PaymentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusDetail { get; set; } = string.Empty;
    public string PaymentMethodId { get; set; } = string.Empty;
    public string PaymentTypeId { get; set; } = string.Empty;
    public ChargeStatus ChargeStatus { get; set; }
    public MercadoPagoPixDto? Pix { get; set; }
    public MercadoPagoBoletoDto? Boleto { get; set; }
}

public class MercadoPagoPixDto
{
    public string QrCode { get; set; } = string.Empty;
    public string QrCodeBase64 { get; set; } = string.Empty;
    public string TicketUrl { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
}

public class MercadoPagoBoletoDto
{
    public string Url { get; set; } = string.Empty;
    public string DigitableLine { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
}
