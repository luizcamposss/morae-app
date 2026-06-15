using AutoMapper;
using backend.Data;
using backend.DTOs.Unit;
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

        return _mapper.Map<UnitResponseDto>(unit);
    }

    public async Task<IEnumerable<UnitResponseDto>> GetByBuildingAsync(int userId,int buildingId)
    {
        var building = await _context.Buildings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            throw new NotFoundException("Building not found.");

        await _permissionService.EnsureBuildingAccessAsync(userId, buildingId);

        var units = await _context.Units
            .AsNoTracking()
            .Where(u => u.BuildingId == buildingId)
            .ToListAsync();

        return _mapper.Map<IEnumerable<UnitResponseDto>>(units);
    }

    public async Task<UnitResponseDto?> GetByIdAsync(int userId,int unitId)
    {
        var unit = await _context.Units
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == unitId);

        if (unit is null)
            return null;

        await _permissionService.EnsureUnitAccessAsync(userId, unitId);

        return _mapper.Map<UnitResponseDto>(unit);
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

        _context.Units.Remove(unit);
        await _context.SaveChangesAsync();

        return true;
    }
}
