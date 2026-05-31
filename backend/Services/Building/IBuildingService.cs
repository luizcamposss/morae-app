using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Building;

namespace backend.Services.Building;

public interface IBuildingService
{
    Task<BuildingResponseDto> CreateAsync(int condominiumId, CreateBuildingDto dto);
    Task<IEnumerable<BuildingResponseDto>> GetByCondominiumAsync(int condominiumId);
    Task<BuildingResponseDto?> GetByIdAsync(int id);
    Task<bool> UpdateAsync(int id, UpdateBuildingDto dto);
    Task<bool> DeleteAsync(int id);
}