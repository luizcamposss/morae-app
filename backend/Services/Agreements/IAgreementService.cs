using backend.DTOs.Agreement;

namespace backend.Services.Agreements;

public interface IAgreementService
{
    Task<IEnumerable<AgreementResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<IEnumerable<AgreementResponseDto>> GetMineAsync(int userId);
    Task<AgreementResponseDto> GetByIdAsync(int userId, int id);
    Task<AgreementResponseDto> CreateAsync(int userId, int condominiumId, CreateAgreementDto dto);
    Task<AgreementResponseDto> CancelAsync(int userId, int id, CancelAgreementDto dto);

    // Hourly job: completes fully paid agreements and breaks the ones with an installment
    // unpaid for more than BreakAfterDaysLate days.
    Task UpdateAgreementsAsync(CancellationToken cancellationToken);
}
