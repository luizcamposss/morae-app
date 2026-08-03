using backend.DTOs.FinancialAccount;

namespace backend.Services.FinancialAccounts;

public interface IFinancialAccountService
{
    Task<FinancialAccountResponseDto?> GetPlatformAsync(int userId);
    Task<FinancialAccountResponseDto> UpsertPlatformAsync(int userId, UpsertFinancialAccountDto dto);
    Task<FinancialAccountResponseDto?> GetByCondominiumAsync(int userId, int condominiumId);
    Task<FinancialAccountResponseDto> UpsertByCondominiumAsync(int userId, int condominiumId, UpsertFinancialAccountDto dto);
}
