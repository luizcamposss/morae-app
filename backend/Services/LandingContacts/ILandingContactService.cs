using backend.DTOs.LandingContact;
using backend.Enums;

namespace backend.Services.LandingContacts;

public interface ILandingContactService
{
    // Anonymous: the landing page form.
    Task CreateAsync(CreateLandingContactDto dto);

    // Master only.
    Task<IEnumerable<LandingContactResponseDto>> GetAllAsync(int userId, LandingContactStatus? status);
    Task<LandingContactResponseDto> UpdateStatusAsync(int userId, int id, UpdateLandingContactStatusDto dto);
}
