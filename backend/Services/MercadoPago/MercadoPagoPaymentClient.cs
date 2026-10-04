using backend.DTOs.MercadoPago;
using backend.Exceptions;
using MercadoPago.Client;
using MercadoPago.Client.Payment;
using MercadoPago.Error;
using MercadoPago.Resource.Payment;

namespace backend.Services.MercadoPago;

public class MercadoPagoPaymentClient : IMercadoPagoPaymentClient
{
    private readonly ILogger<MercadoPagoPaymentClient> _logger;

    public MercadoPagoPaymentClient(ILogger<MercadoPagoPaymentClient> logger)
    {
        _logger = logger;
    }

    public async Task<MercadoPagoPaymentDetailsDto> GetAsync(
        long paymentId,
        string accessToken)
    {
        try
        {
            var payment = await new PaymentClient().GetAsync(
                paymentId,
                new RequestOptions { AccessToken = accessToken });

            return Map(payment);
        }
        catch (MercadoPagoException exception)
        {
            _logger.LogError(exception, "Mercado Pago payment {PaymentId} query failed.", paymentId);
            throw new BadRequestException("Não foi possível consultar o pagamento no Mercado Pago.");
        }
    }

    public async Task<MercadoPagoPaymentDetailsDto> CreateAsync(
        PaymentCreateRequest request,
        string accessToken,
        string idempotencyKey)
    {
        var requestOptions = new RequestOptions { AccessToken = accessToken };
        requestOptions.CustomHeaders.Add("X-Idempotency-Key", idempotencyKey);

        try
        {
            var payment = await new PaymentClient().CreateAsync(request, requestOptions);

            return Map(payment);
        }
        catch (MercadoPagoApiException exception)
        {
            _logger.LogError(
                exception,
                "Mercado Pago payment creation failed: {StatusCode} {Content}",
                exception.StatusCode,
                exception.ApiResponse?.Content);
            throw new BadRequestException(
                exception.ApiResponse?.Content?.Contains("payer.email", StringComparison.OrdinalIgnoreCase) == true
                    ? "O Mercado Pago não aceitou o e-mail informado. Use um e-mail válido e tente novamente."
                    : "O Mercado Pago não conseguiu processar o pagamento. Confira os dados e tente novamente.");
        }
        catch (MercadoPagoException exception)
        {
            _logger.LogError(exception, "Mercado Pago payment creation failed.");
            throw new BadRequestException("O Mercado Pago não conseguiu processar o pagamento. Tente novamente.");
        }
    }

    public async Task<MercadoPagoPaymentDetailsDto> CancelAsync(long paymentId, string accessToken)
    {
        try
        {
            var payment = await new PaymentClient().CancelAsync(
                paymentId,
                new RequestOptions { AccessToken = accessToken });

            return Map(payment);
        }
        catch (MercadoPagoException exception)
        {
            _logger.LogWarning(exception, "Mercado Pago payment {PaymentId} could not be cancelled.", paymentId);
            throw new BadRequestException("Não foi possível cancelar o pagamento no Mercado Pago.");
        }
    }

    public async Task RefundAsync(long paymentId, string accessToken, string idempotencyKey)
    {
        var requestOptions = new RequestOptions { AccessToken = accessToken };
        requestOptions.CustomHeaders.Add("X-Idempotency-Key", idempotencyKey);

        try
        {
            await new PaymentClient().RefundAsync(paymentId, requestOptions);
        }
        catch (MercadoPagoApiException exception)
        {
            _logger.LogError(
                exception,
                "Mercado Pago refund of payment {PaymentId} failed: {StatusCode} {Content}",
                paymentId,
                exception.StatusCode,
                exception.ApiResponse?.Content);
            throw new BadRequestException(
                "O Mercado Pago recusou o estorno. Verifique o saldo da conta ou o prazo para estorno e tente novamente.");
        }
        catch (MercadoPagoException exception)
        {
            _logger.LogError(exception, "Mercado Pago refund of payment {PaymentId} failed.", paymentId);
            throw new BadRequestException("Não foi possível estornar o pagamento no Mercado Pago. Tente novamente.");
        }
    }

    private static MercadoPagoPaymentDetailsDto Map(Payment payment)
    {
        var transactionData = payment.PointOfInteraction?.TransactionData;

        return new MercadoPagoPaymentDetailsDto
        {
            Id = payment.Id
                ?? throw new BadRequestException("O Mercado Pago retornou um pagamento inválido."),
            CollectorId = payment.CollectorId,
            ExternalReference = payment.ExternalReference ?? string.Empty,
            CurrencyId = payment.CurrencyId ?? string.Empty,
            TransactionAmount = payment.TransactionAmount
                ?? throw new BadRequestException("O Mercado Pago retornou um pagamento inválido."),
            Status = payment.Status ?? string.Empty,
            StatusDetail = payment.StatusDetail ?? string.Empty,
            PaymentMethodId = payment.PaymentMethodId ?? string.Empty,
            PaymentTypeId = payment.PaymentTypeId ?? string.Empty,
            // The SDK parses Mercado Pago's offset timestamps into local time; the app stores UTC.
            DateApproved = payment.DateApproved?.ToUniversalTime(),
            DateOfExpiration = payment.DateOfExpiration?.ToUniversalTime(),
            PixQrCode = transactionData?.QrCode ?? string.Empty,
            PixQrCodeBase64 = transactionData?.QrCodeBase64 ?? string.Empty,
            PixTicketUrl = transactionData?.TicketUrl ?? string.Empty,
            BoletoUrl = payment.TransactionDetails?.ExternalResourceUrl ?? string.Empty,
            BoletoDigitableLine = payment.TransactionDetails?.DigitableLine ?? string.Empty
        };
    }
}
