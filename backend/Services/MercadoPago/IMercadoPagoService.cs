using backend.DTOs.MercadoPago;

namespace backend.Services.MercadoPago;

public interface IMercadoPagoService
{
    Task<MercadoPagoOAuthStartResponseDto> StartOAuthAsync(int userId, int? condominiumId);
    Task<MercadoPagoConnectionStatusDto> CompleteOAuthAsync(int userId, MercadoPagoOAuthCompleteDto dto);
    Task<MercadoPagoConnectionStatusDto> GetConnectionStatusAsync(int userId, int? condominiumId);
    Task DisconnectAsync(int userId, int? condominiumId);
    Task<MercadoPagoCheckoutResponseDto> CreateCheckoutAsync(int userId, int chargeId);
    Task HandleWebhookAsync(
        MercadoPagoWebhookDto notification,
        string? queryType,
        string? queryDataId,
        string? signature,
        string? requestId);
}
