using backend.DTOs.MercadoPago;
using backend.Exceptions;
using MercadoPago.Client;
using MercadoPago.Client.Payment;
using MercadoPago.Error;

namespace backend.Services.MercadoPago;

public class MercadoPagoPaymentClient : IMercadoPagoPaymentClient
{
    public async Task<MercadoPagoPaymentDetailsDto> GetAsync(
        long paymentId,
        string accessToken)
    {
        try
        {
            var payment = await new PaymentClient().GetAsync(
                paymentId,
                new RequestOptions { AccessToken = accessToken });

            return new MercadoPagoPaymentDetailsDto
            {
                Id = payment.Id
                    ?? throw new BadRequestException("Mercado Pago returned a payment without an ID."),
                CollectorId = payment.CollectorId,
                ExternalReference = payment.ExternalReference ?? string.Empty,
                CurrencyId = payment.CurrencyId ?? string.Empty,
                TransactionAmount = payment.TransactionAmount
                    ?? throw new BadRequestException("Mercado Pago returned a payment without an amount."),
                Status = payment.Status ?? string.Empty,
                StatusDetail = payment.StatusDetail ?? string.Empty,
                PaymentMethodId = payment.PaymentMethodId ?? string.Empty,
                PaymentTypeId = payment.PaymentTypeId ?? string.Empty,
                DateApproved = payment.DateApproved
            };
        }
        catch (MercadoPagoApiException exception)
        {
            throw new BadRequestException($"Mercado Pago payment query error: {exception.Message}");
        }
        catch (MercadoPagoException exception)
        {
            throw new BadRequestException($"Mercado Pago payment query error: {exception.Message}");
        }
    }
}
