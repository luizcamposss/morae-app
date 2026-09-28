namespace backend.DTOs.MercadoPago;

public class MercadoPagoPaymentSetupDto
{
    public int ChargeId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;

    // Public key of the receiving account: the Payment Brick must tokenize cards with the
    // same account whose access token creates the payment.
    public string PublicKey { get; set; } = string.Empty;

    // A payment still open for this charge: a Pix/boleto waiting to be paid or a card under review.
    public MercadoPagoPaymentResultDto? PendingPayment { get; set; }
}
