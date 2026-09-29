using backend.DTOs.MercadoPago;
using MercadoPago.Client.Payment;

namespace backend.Services.MercadoPago;

public interface IMercadoPagoPaymentClient
{
    Task<MercadoPagoPaymentDetailsDto> GetAsync(long paymentId, string accessToken);

    Task<MercadoPagoPaymentDetailsDto> CreateAsync(
        PaymentCreateRequest request,
        string accessToken,
        string idempotencyKey);

    Task<MercadoPagoPaymentDetailsDto> CancelAsync(long paymentId, string accessToken);

    Task RefundAsync(long paymentId, string accessToken, string idempotencyKey);
}
