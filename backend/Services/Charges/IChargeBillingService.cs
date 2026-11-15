using backend.DTOs.Charge;
using backend.DTOs.Condominium;

namespace backend.Services.Charges;

public interface IChargeBillingService
{
    Task<BillingSettingsDto> GetSettingsAsync(int userId, int condominiumId);
    Task<BillingSettingsDto> UpdateSettingsAsync(int userId, int condominiumId, UpdateBillingSettingsDto dto);

    Task<IEnumerable<RecurringChargeResponseDto>> GetRecurringAsync(int userId, int condominiumId);

    // The condominium fee of every month (a fixed charge of the whole condominium, #211).
    Task<CondominiumFeeDto> GetFeeAsync(int userId, int condominiumId);
    Task<CondominiumFeeDto> SaveFeeAsync(int userId, int condominiumId, SaveCondominiumFeeDto dto);
    Task<RecurringChargeResponseDto> CreateRecurringAsync(int userId, int condominiumId, CreateRecurringChargeDto dto);
    Task<RecurringChargeResponseDto> PauseRecurringAsync(int userId, int id);
    Task<RecurringChargeResponseDto> ResumeRecurringAsync(int userId, int id);
    Task<RecurringChargeResponseDto> EndRecurringAsync(int userId, int id);

    // Scheduled job: generates this month's (or next month's) charges of every active recurrence
    // whose due date is at most 10 days away. Idempotent.
    Task GenerateDueRecurringChargesAsync(CancellationToken cancellationToken);
}
