using backend.DTOs.Consumption;

namespace backend.Services.Consumption;

public interface IConsumptionService
{
    Task<UtilitySettingsDto> SaveSettingsAsync(int userId, int condominiumId, UtilitySettingsDto dto);
    Task<UtilityMonthDto> GetMonthAsync(int userId, int condominiumId, string? month);
    Task<SaveUtilitiesResultDto> SaveMonthAsync(int userId, int condominiumId, SaveUtilitiesDto dto);
    Task<List<ConsumptionHistoryDto>> GetMineAsync(int userId);
}
