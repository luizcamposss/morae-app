using backend.DTOs.MercadoPago;

namespace backend.Services.MercadoPago;

public interface IMercadoPagoPaymentClient
{
    Task<MercadoPagoPaymentDetailsDto> GetAsync(long paymentId, string accessToken);
}
