using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Building;

namespace backend.Services.Buildings;

public interface IBuildingService
{
    Task<BuildingResponseDto> CreateAsync(int userId, int condominiumId, CreateBuildingDto dto);
    Task<IEnumerable<BuildingResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<BuildingResponseDto?> GetByIdAsync(int userId, int buildingId);
    Task<bool> UpdateAsync(int userId, int buildingId, UpdateBuildingDto dto);
    Task<bool> DeleteAsync(int userId, int buildingId);
}