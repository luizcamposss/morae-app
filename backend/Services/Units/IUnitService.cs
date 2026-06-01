using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Unit;

namespace backend.Services.Units;

public interface IUnitService
{
    Task<UnitResponseDto> CreateAsync(int buildingId, CreateUnitDto dto);
    Task<IEnumerable<UnitResponseDto>> GetByBuildingAsync(int buildingId);
    Task<UnitResponseDto?> GetByIdAsync(int id);
    Task<bool> UpdateAsync(int id, UpdateUnitDto dto);
    Task<bool> DeleteAsync(int id);
}