using backend.Enums;

namespace backend.DTOs.MercadoPago;

public class MercadoPagoPaymentStatusDto
{
    public ChargeStatus ChargeStatus { get; set; }
    public string? PaymentStatus { get; set; }
}
