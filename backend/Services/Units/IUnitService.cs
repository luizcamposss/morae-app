using backend.DTOs.Unit;

namespace backend.Services.Units;

public interface IUnitService
{
    Task<UnitResponseDto> CreateAsync(int userId, int buildingId, CreateUnitDto dto);
    Task<IEnumerable<UnitResponseDto>> GetByBuildingAsync(int userId, int buildingId);
    Task<UnitResponseDto?> GetByIdAsync(int userId, int unitId);
    Task<bool> UpdateAsync(int userId, int unitId, UpdateUnitDto dto);
    Task<bool> DeleteAsync(int userId, int unitId);
}