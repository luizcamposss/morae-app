using backend.DTOs.Consumption;
using backend.Enums;

namespace backend.Services.Consumption;

public interface IConsumptionService
{
    Task<List<UtilityRateDto>> GetRatesAsync(int userId, int condominiumId);
    Task<List<UtilityRateDto>> SaveRatesAsync(int userId, int condominiumId, SaveUtilityRatesDto dto);
    Task<ReadingMonthDto> GetMonthAsync(int userId, int condominiumId, string? month, ChargeCategory category);
    Task<SaveReadingsResultDto> SaveReadingsAsync(int userId, int condominiumId, SaveReadingsDto dto);
    Task<List<ConsumptionHistoryDto>> GetMineAsync(int userId);
}
