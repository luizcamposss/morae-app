using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Data;
using backend.DTOs.Building;
using backend.Models;
using backend.Services.Buildings;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;
public class BuildingService : IBuildingService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;

    public BuildingService(AppDbContext context, IMapper mapper, IPermissionService permissionService)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
    }
    public async Task<BuildingResponseDto> CreateAsync(int userId, int condominiumId, CreateBuildingDto dto)
    {
        var condominiumExists = await _context.Condominiums.AnyAsync(c => c.Id == condominiumId);

        if (!condominiumExists)
        {
            throw new Exception("Condominium not found");
        }

        bool hasAccess = await _permissionService.HasCondominiumAccessAsync(userId, condominiumId);

        if (!hasAccess)
            throw new Exception("You do not have access to this condominium.");

        var codeExists = await _context.Buildings.AnyAsync(c => c.CondominiumId == condominiumId && c.Code == dto.Code);

        if (codeExists)
        {
            throw new Exception("Building code already exists in this condominium");
        }

        var building = _mapper.Map<Building>(dto);

        building.CondominiumId = condominiumId;
        building.CreatedAt = DateTime.UtcNow;
        building.UpdatedAt = DateTime.UtcNow;

        _context.Buildings.Add(building);
        await _context.SaveChangesAsync();

        return _mapper.Map<BuildingResponseDto>(building);
    }
    public async Task<IEnumerable<BuildingResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        var condominiumExists = await _context.Condominiums.AnyAsync(c => c.Id == condominiumId);

        if (!condominiumExists)
        {
            throw new Exception("Condominium wasn't registered");
        }

        bool hasAccess = await _permissionService.HasCondominiumAccessAsync(userId, condominiumId);

        if (!hasAccess)
            throw new Exception("You do not have access to this condominium.");

        var buildings = await _context.Buildings
            .AsNoTracking()
            .Where(c => c.CondominiumId == condominiumId)
            .ToListAsync();

        return _mapper.Map<IEnumerable<BuildingResponseDto>>(buildings);
    }

    public async Task<BuildingResponseDto?> GetByIdAsync(int userId, int buildingId)
    {
        var building = await _context.Buildings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            return null;

        bool hasAccess = await _permissionService.HasBuildingAccessAsync(userId, buildingId);

        if (!hasAccess)
            throw new Exception("You do not have access to this building.");

        return _mapper.Map<BuildingResponseDto>(building);
    }

    public async Task<bool> UpdateAsync(int userId, int buildingId, UpdateBuildingDto dto)
    {
        var building = await _context.Buildings
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            return false;

        bool hasAccess = await _permissionService.HasBuildingAccessAsync(userId, buildingId);

        if (!hasAccess)
            throw new Exception("You do not have access to this building.");

        var codeExists = await _context.Buildings
            .AnyAsync(b =>
                b.CondominiumId == building.CondominiumId &&
                b.Code == dto.Code &&
                b.Id != buildingId);

        if (codeExists)
            throw new Exception("Building code already exists in this condominium.");

        _mapper.Map(dto, building);

        building.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
    public async Task<bool> DeleteAsync(int userId, int buildingId)
    {
        var building = await _context.Buildings
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            return false;

        bool hasAccess = await _permissionService.HasBuildingAccessAsync(userId, buildingId);

        if (!hasAccess)
            throw new Exception("You do not have access to this building.");

        _context.Buildings.Remove(building);
        await _context.SaveChangesAsync();

        return true;
    }
}