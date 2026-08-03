using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Data;
using backend.Constants;
using backend.DTOs.Building;
using backend.Enums;
using backend.Exceptions;
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

    private IQueryable<BuildingResponseDto> BuildBuildingResponseQuery()
    {
        return _context.Buildings
            .AsNoTracking()
            .Select(b => new BuildingResponseDto
            {
                Id = b.Id,
                CondominiumId = b.CondominiumId,
                Name = b.Name,
                Code = b.Code,
                BuildingType = b.BuildingType,
                FloorCount = b.FloorCount,
                HasElevator = b.HasElevator,
                Notes = b.Notes,
                UnitCount = b.Units.Count,
                ResidentCount = _context.PersonUnits.Count(pu => pu.Unit.BuildingId == b.Id),
                OccupiedUnitCount = _context.Units.Count(u =>
                    u.BuildingId == b.Id &&
                    _context.PersonUnits.Any(pu => pu.UnitId == u.Id)),
                SyndicUserId = _context.UserCondominiums
                    .Where(uc =>
                        uc.CondominiumId == b.CondominiumId &&
                        uc.Role == AppRoles.Syndic &&
                        uc.Status == UserCondominiumStatus.Active &&
                        _context.PersonUnits.Any(pu =>
                            pu.PersonId == uc.User.PersonId &&
                            pu.Unit.BuildingId == b.Id))
                    .OrderBy(uc => uc.Id)
                    .Select(uc => (int?)uc.UserId)
                    .FirstOrDefault(),
                SyndicName = _context.UserCondominiums
                    .Where(uc =>
                        uc.CondominiumId == b.CondominiumId &&
                        uc.Role == AppRoles.Syndic &&
                        uc.Status == UserCondominiumStatus.Active &&
                        _context.PersonUnits.Any(pu =>
                            pu.PersonId == uc.User.PersonId &&
                            pu.Unit.BuildingId == b.Id))
                    .OrderBy(uc => uc.Id)
                    .Select(uc => uc.User.Person.Name)
                    .FirstOrDefault() ?? string.Empty,
                SyndicEmail = _context.UserCondominiums
                    .Where(uc =>
                        uc.CondominiumId == b.CondominiumId &&
                        uc.Role == AppRoles.Syndic &&
                        uc.Status == UserCondominiumStatus.Active &&
                        _context.PersonUnits.Any(pu =>
                            pu.PersonId == uc.User.PersonId &&
                            pu.Unit.BuildingId == b.Id))
                    .OrderBy(uc => uc.Id)
                    .Select(uc => uc.User.Email)
                    .FirstOrDefault() ?? string.Empty,
                Status = _context.Units.Any(u =>
                    u.BuildingId == b.Id &&
                    _context.PersonUnits.Any(pu => pu.UnitId == u.Id))
                    ? "Ativo"
                    : "Atencao",
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt
            });
    }

    public async Task<BuildingResponseDto> CreateAsync(int userId, int condominiumId, CreateBuildingDto dto)
    {
        var condominiumExists = await _context.Condominiums.AnyAsync(c => c.Id == condominiumId);

        if (!condominiumExists)
        {
            throw new NotFoundException("Condominium not found");
        }

        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        var codeExists = await _context.Buildings.AnyAsync(c => c.CondominiumId == condominiumId && c.Code == dto.Code);

        if (codeExists)
        {
            throw new ConflictException("Building code already exists in this condominium");
        }

        var building = _mapper.Map<Building>(dto);

        building.CondominiumId = condominiumId;
        building.CreatedAt = DateTime.UtcNow;
        building.UpdatedAt = DateTime.UtcNow;

        _context.Buildings.Add(building);
        await _context.SaveChangesAsync();

        return await BuildBuildingResponseQuery()
            .FirstAsync(b => b.Id == building.Id);
    }
    public async Task<IEnumerable<BuildingResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        var condominiumExists = await _context.Condominiums.AnyAsync(c => c.Id == condominiumId);

        if (!condominiumExists)
        {
            throw new NotFoundException("Condominium wasn't registered");
        }

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            condominiumId,
            AppPermissions.ResidentsView);

        var query = BuildBuildingResponseQuery()
            .Where(b => b.CondominiumId == condominiumId)
            .AsQueryable();

        if (await _permissionService.IsSyndicAsync(userId))
        {
            var linkedBuildingIds = await GetLinkedBuildingIdsAsync(userId, condominiumId);
            query = query.Where(building => linkedBuildingIds.Contains(building.Id));
        }

        return await query.ToListAsync();
    }

    public async Task<BuildingResponseDto?> GetByIdAsync(int userId, int buildingId)
    {
        var building = await _context.Buildings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            return null;

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            building.CondominiumId,
            AppPermissions.ResidentsView);

        await _permissionService.EnsureBuildingAccessAsync(userId, buildingId);

        return await BuildBuildingResponseQuery()
            .FirstOrDefaultAsync(b => b.Id == buildingId);
    }

    public async Task<bool> UpdateAsync(int userId, int buildingId, UpdateBuildingDto dto)
    {
        var building = await _context.Buildings
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            return false;

        await _permissionService.EnsureBuildingAccessAsync(userId, buildingId);

        var codeExists = await _context.Buildings
            .AnyAsync(b =>
                b.CondominiumId == building.CondominiumId &&
                b.Code == dto.Code &&
                b.Id != buildingId);

        if (codeExists)
            throw new ConflictException("Building code already exists in this condominium.");

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
        
        await _permissionService.EnsureBuildingAccessAsync(userId, buildingId);

        _context.Buildings.Remove(building);
        await _context.SaveChangesAsync();

        return true;
    }
    private async Task<List<int>> GetLinkedBuildingIdsAsync(int userId, int condominiumId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            throw new NotFoundException("User not found.");

        return await _context.PersonUnits
            .AsNoTracking()
            .Where(personUnit =>
                personUnit.PersonId == user.PersonId &&
                personUnit.Unit.Building.CondominiumId == condominiumId)
            .Select(personUnit => personUnit.Unit.BuildingId)
            .Distinct()
            .ToListAsync();
    }
}
