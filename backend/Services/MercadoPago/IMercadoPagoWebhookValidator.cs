namespace backend.Services.MercadoPago;

public interface IMercadoPagoWebhookValidator
{
    void Validate(string? signature, string? requestId, string? dataId);
}
