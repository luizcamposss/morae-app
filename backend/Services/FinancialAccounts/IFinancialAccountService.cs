using backend.DTOs.FinancialAccount;
using backend.Models;

namespace backend.Services.FinancialAccounts;

public interface IFinancialAccountService
{
    Task<FinancialAccountResponseDto?> GetPlatformAsync(int userId);
    Task<FinancialAccountResponseDto> UpsertPlatformAsync(int userId, UpsertFinancialAccountDto dto);
    Task<FinancialAccountResponseDto?> GetByCondominiumAsync(int userId, int condominiumId);
    Task<FinancialAccountResponseDto> UpsertByCondominiumAsync(int userId, int condominiumId, UpsertFinancialAccountDto dto);

    // No permission check: the caller already decided the user may pay a charge of this condominium.
    Task<FinancialAccount?> GetCondominiumPixAccountAsync(int condominiumId);
}
