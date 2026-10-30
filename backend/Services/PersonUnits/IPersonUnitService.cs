using backend.DTOs.PersonUnit;

namespace backend.Services.PersonUnits;

public interface IPersonUnitService
{
    Task<PersonUnitResponseDto> CreateAsync(int userId, int unitId, CreatePersonUnitDto dto);
    Task<IEnumerable<PersonUnitResponseDto>> GetByUnitAsync(int userId, int unitId);
    Task<bool> DeleteAsync(int userId, int id);
}