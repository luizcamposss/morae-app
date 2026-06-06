using backend.DTOs.Condominium;

namespace backend.Services.Condominium;

public interface ICondominiumService
{
    Task<CondominiumResponseDto> CreateAsync(CreateCondominiumDto dto, int userId);
    Task<IEnumerable<CondominiumResponseDto>> GetAllAsync();
    Task<CondominiumResponseDto?> GetByIdAsync(int id);
    Task<bool> UpdateAsync(int id, UpdateCondominiumDto dto);
    Task<bool> DeleteAsync(int id);
}