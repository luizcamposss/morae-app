using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Unit;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Units;

public class UnitService : IUnitService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    public UnitService(AppDbContext context, IMapper mapper, IPermissionService permissionService)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
    }

    private IQueryable<UnitResponseDto> BuildUnitResponseQuery()
    {
        return _context.Units
            .AsNoTracking()
            .Select(unit => new UnitResponseDto
            {
                Id = unit.Id,
                BuildingId = unit.BuildingId,
                CondominiumId = unit.Building.CondominiumId,
                BuildingName = unit.Building.Name,
                Number = unit.Number,
                UnitType = unit.UnitType,
                Rooms = unit.Rooms,
                Bathrooms = unit.Bathrooms,
                SquareMeters = unit.SquareMeters,
                Observations = unit.Observations,
                ResidentCount = _context.PersonUnits.Count(personUnit => personUnit.UnitId == unit.Id),
                ResponsiblePersonName = _context.PersonUnits
                    .Where(personUnit => personUnit.UnitId == unit.Id)
                    .OrderBy(personUnit =>
                        personUnit.RelationshipType == UnitRelationshipType.Owner ? 0 :
                        personUnit.RelationshipType == UnitRelationshipType.Resident ? 1 :
                        personUnit.RelationshipType == UnitRelationshipType.Tenant ? 2 : 3)
                    .Select(personUnit => personUnit.Person.Name)
                    .FirstOrDefault() ?? string.Empty,
                Status = _context.PersonUnits.Any(personUnit => personUnit.UnitId == unit.Id)
                    ? "Ocupada"
                    : "Vaga",
                CreatedAt = unit.CreatedAt,
                UpdatedAt = unit.UpdatedAt,
            });
    }

    public async Task<UnitResponseDto> CreateAsync(int userId,int buildingId,CreateUnitDto dto)
    {
        var building = await _context.Buildings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            throw new NotFoundException("Building not found.");

        await _permissionService.EnsureBuildingAccessAsync(userId, buildingId);

        var numberExists = await _context.Units
            .AnyAsync(u =>
                u.BuildingId == buildingId &&
                u.Number == dto.Number);

        if (numberExists)
            throw new ConflictException("Unit number already exists in this building.");

        var unit = _mapper.Map<Unit>(dto);

        unit.BuildingId = buildingId;
        unit.CreatedAt = DateTime.UtcNow;
        unit.UpdatedAt = DateTime.UtcNow;

        _context.Units.Add(unit);
        await _context.SaveChangesAsync();

        return await BuildUnitResponseQuery()
            .FirstAsync(unitResponse => unitResponse.Id == unit.Id);
    }

    public async Task<IEnumerable<UnitResponseDto>> GetByBuildingAsync(int userId,int buildingId)
    {
        var building = await _context.Buildings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            throw new NotFoundException("Building not found.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            building.CondominiumId,
            AppPermissions.ResidentsView);

        await _permissionService.EnsureBuildingAccessAsync(userId, buildingId);

        return await BuildUnitResponseQuery()
            .Where(unit => unit.BuildingId == buildingId)
            .ToListAsync();
    }

    public async Task<UnitResponseDto?> GetByIdAsync(int userId,int unitId)
    {
        var unit = await _context.Units
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == unitId);

        if (unit is null)
            return null;

        var condominiumId = await _context.Units
            .AsNoTracking()
            .Where(u => u.Id == unitId)
            .Select(u => u.Building.CondominiumId)
            .FirstAsync();

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            condominiumId,
            AppPermissions.ResidentsView);

        await _permissionService.EnsureUnitAccessAsync(userId, unitId);

        return await BuildUnitResponseQuery()
            .FirstOrDefaultAsync(unitResponse => unitResponse.Id == unitId);
    }

    public async Task<bool> UpdateAsync(int userId,int unitId,UpdateUnitDto dto)
    {
        var unit = await _context.Units
            .FirstOrDefaultAsync(u => u.Id == unitId);

        if (unit is null)
            return false;

        await _permissionService.EnsureUnitAccessAsync(userId, unitId);

        var numberExists = await _context.Units
            .AnyAsync(u =>
                u.BuildingId == unit.BuildingId &&
                u.Number == dto.Number &&
                u.Id != unitId);

        if (numberExists)
            throw new ConflictException("Unit number already exists in this building.");

        _mapper.Map(dto, unit);

        unit.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int userId,int unitId)
    {
        var unit = await _context.Units
            .FirstOrDefaultAsync(u => u.Id == unitId);

        if (unit is null)
            return false;

        await _permissionService.EnsureUnitAccessAsync(userId, unitId);

        var hasLinkedPeople = await _context.PersonUnits
            .AnyAsync(personUnit => personUnit.UnitId == unitId);

        if (hasLinkedPeople)
            throw new ConflictException("Cannot delete a unit that still has linked people.");

        _context.Units.Remove(unit);
        await _context.SaveChangesAsync();

        return true;
    }
}
