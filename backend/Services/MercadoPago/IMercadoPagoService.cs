using backend.DTOs.MercadoPago;

namespace backend.Services.MercadoPago;

public interface IMercadoPagoService
{
    Task<MercadoPagoOAuthStartResponseDto> StartOAuthAsync(int userId);
    Task<MercadoPagoConnectionStatusDto> CompleteOAuthAsync(string code, string state);
    Task<MercadoPagoConnectionStatusDto> GetConnectionStatusAsync(int userId);
    Task<MercadoPagoCheckoutResponseDto> CreateCheckoutAsync(int userId, int chargeId);
    Task HandleWebhookAsync(
        MercadoPagoWebhookDto notification,
        string? queryType,
        string? queryDataId,
        string? signature,
        string? requestId);
}
