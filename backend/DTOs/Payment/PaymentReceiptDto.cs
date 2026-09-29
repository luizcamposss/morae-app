using backend.Enums;

namespace backend.DTOs.Payment;

public class PaymentReceiptDto
{
    public int ChargeId { get; set; }
    public string Description { get; set; } = string.Empty;
    public ChargeScope Scope { get; set; }
    public string CondominiumName { get; set; } = string.Empty;
    public string? UnitLabel { get; set; }
    public string ReceiverName { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public DateTime PaidAt { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public PaymentSource Source { get; set; }
    public long? MercadoPagoPaymentId { get; set; }
    public string RegisteredByName { get; set; } = string.Empty;

    // True when the viewer received this Mercado Pago payment and may refund it.
    public bool CanRefund { get; set; }
}
