using backend.DTOs.Condominium;

namespace backend.Services.Condominium;

public interface ICondominiumService
{
    Task<CondominiumResponseDto> OnboardAsync(int masterUserId, CreateCondominiumOnboardingDto dto);
    Task<CondominiumResponseDto> CreateAsync(int userId, CreateCondominiumDto dto);
    Task<IEnumerable<CondominiumResponseDto>> GetAllAsync(int userId);
    Task<IEnumerable<CondominiumResponseDto>> GetMineAsync(int userId);
    Task<CondominiumResponseDto?> GetByIdAsync(int userId, int id);
    Task<bool> UpdateAsync(int userId, int id, UpdateCondominiumDto dto);
    Task<bool> UpdateStatusAsync(int userId, int id, UpdateCondominiumStatusDto dto);
    Task<bool> UpdateAdminAsync(int userId, int id, UpdateCondominiumAdminDto dto);
    Task<bool> RemoveAdminAsync(int userId, int id);
    Task<bool> DeleteAsync(int userId, int id);
}
