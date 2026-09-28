using backend.DTOs.MercadoPago;

namespace backend.Services.MercadoPago;

public interface IMercadoPagoService
{
    Task<MercadoPagoOAuthStartResponseDto> StartOAuthAsync(int userId, int? condominiumId);
    Task<MercadoPagoConnectionStatusDto> CompleteOAuthAsync(int userId, MercadoPagoOAuthCompleteDto dto);
    Task<MercadoPagoConnectionStatusDto> GetConnectionStatusAsync(int userId, int? condominiumId);
    Task DisconnectAsync(int userId, int? condominiumId);
    Task<MercadoPagoPaymentSetupDto> GetPaymentSetupAsync(int userId, int chargeId);
    Task<MercadoPagoPaymentResultDto> CreatePaymentAsync(int userId, int chargeId, MercadoPagoCreatePaymentDto dto);
    Task<MercadoPagoPaymentStatusDto> GetPaymentStatusAsync(int userId, int chargeId);
    Task CancelOpenPaymentAsync(int chargeId);
    Task HandleWebhookAsync(
        MercadoPagoWebhookDto notification,
        string? queryType,
        string? queryDataId,
        string? signature,
        string? requestId);
}
