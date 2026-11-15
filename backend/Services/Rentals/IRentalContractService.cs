using backend.DTOs.Rental;

namespace backend.Services.Rentals;

public interface IRentalContractService
{
    Task<IEnumerable<RentalContractResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<IEnumerable<RentalContractResponseDto>> GetMineAsync(int userId);
    Task<RentalContractResponseDto> CreateAsync(int userId, int condominiumId, SaveRentalContractDto dto);

    // Unit owner (#201): contracts of the units they own, received in their own account.
    Task<IEnumerable<RentalContractResponseDto>> GetOwnedAsync(int userId);
    Task<RentalContractResponseDto> CreateAsOwnerAsync(int userId, SaveRentalContractDto dto);
    Task<RentalContractResponseDto> UpdateAsync(int userId, int contractId, SaveRentalContractDto dto);
    Task<RentalContractResponseDto> AdjustAsync(int userId, int contractId, AdjustRentDto dto);
    Task<RentalContractResponseDto> EndAsync(int userId, int contractId, EndRentalContractDto dto);

    // Hourly job: puts the rent of the coming months in the tenants' draft bills, ends contracts
    // past their end date and reminds the management of adjustments 30 days ahead.
    Task GenerateDueRentAsync(CancellationToken cancellationToken);
    Task SendAdjustmentRemindersAsync(CancellationToken cancellationToken);
}
