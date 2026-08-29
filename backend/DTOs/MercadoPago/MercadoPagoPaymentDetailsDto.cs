namespace backend.DTOs.MercadoPago;

public class MercadoPagoPaymentDetailsDto
{
    public long Id { get; set; }
    public long? CollectorId { get; set; }
    public string ExternalReference { get; set; } = string.Empty;
    public string CurrencyId { get; set; } = string.Empty;
    public decimal TransactionAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusDetail { get; set; } = string.Empty;
    public string PaymentMethodId { get; set; } = string.Empty;
    public string PaymentTypeId { get; set; } = string.Empty;
    public DateTime? DateApproved { get; set; }
}
