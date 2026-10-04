using backend.Exceptions;
using backend.Settings;
using MercadoPago.Error;
using MercadoPago.Webhook;
using Microsoft.Extensions.Options;

namespace backend.Services.MercadoPago;

public class MercadoPagoWebhookValidator : IMercadoPagoWebhookValidator
{
    private readonly MercadoPagoSettings _settings;

    public MercadoPagoWebhookValidator(IOptions<MercadoPagoSettings> options)
    {
        _settings = options.Value;
    }

    public void Validate(string? signature, string? requestId, string? dataId)
    {
        if (string.IsNullOrWhiteSpace(_settings.WebhookSecret))
            throw new InvalidOperationException("Mercado Pago Webhook Secret is not configured.");

        try
        {
            WebhookSignatureValidator.Validate(
                signature ?? string.Empty,
                requestId ?? string.Empty,
                dataId ?? string.Empty,
                _settings.WebhookSecret,
                TimeSpan.FromMinutes(_settings.WebhookSignatureToleranceMinutes));
        }
        catch (InvalidWebhookSignatureException)
        {
            throw new UnauthorizedException("Invalid Mercado Pago webhook signature.");
        }
    }
}
