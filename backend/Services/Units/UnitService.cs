using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Data;
using backend.DTOs.Unit;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Units;

public class UnitService : IUnitService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public UnitService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<UnitResponseDto> CreateAsync(int buildingId, CreateUnitDto dto)
    {
        var buildingExists = await _context.Buildings.AnyAsync(c => c.Id == buildingId);

        if (!buildingExists)
        {
            throw new Exception("Building not found");
        }

        var numberExists = await _context.Units.AnyAsync(c => c.BuildingId == buildingId && c.Number == dto.Number);

        if (numberExists)
        {
            throw new Exception("Unit number already exists in this Building");
        }

        var unit = _mapper.Map<Unit>(dto);

        unit.BuildingId = buildingId;
        unit.CreatedAt = DateTime.UtcNow;
        unit.UpdatedAt = DateTime.UtcNow;

        _context.Units.Add(unit);
        await _context.SaveChangesAsync();

        return _mapper.Map<UnitResponseDto>(unit);
    }

    public async Task<IEnumerable<UnitResponseDto>> GetByBuildingAsync(int buildingId)
    {
        var buildingExists = await _context.Buildings.AnyAsync(c => c.Id == buildingId);

        if (!buildingExists)
        {
            throw new Exception("Building wasn't registered");
        }

        var units = await _context.Units
            .AsNoTracking()
            .Where(c => c.BuildingId == buildingId)
            .ToListAsync();

        return _mapper.Map<IEnumerable<UnitResponseDto>>(units);
    }

    public async Task<UnitResponseDto?> GetByIdAsync(int id)
    {
        var unit = await _context.Units
           .AsNoTracking()
           .FirstOrDefaultAsync(b => b.Id == id);

        if (unit is null)
            return null;

        return _mapper.Map<UnitResponseDto>(unit);
    }

    public async Task<bool> UpdateAsync(int id, UpdateUnitDto dto)
    {
        var unit = await _context.Units
            .FirstOrDefaultAsync(b => b.Id == id);

        if (unit is null)
            return false;

        var numberExists = await _context.Units
            .AnyAsync(b =>
                b.BuildingId == unit.BuildingId &&
                b.Number == dto.Number &&
                b.Id != id);

        if (numberExists)
            throw new Exception("Unit number already exists in this building.");

        _mapper.Map(dto, unit);

        unit.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
    public async Task<bool> DeleteAsync(int id)
    {
        var unit = await _context.Units
            .FirstOrDefaultAsync(b => b.Id == id);

        if (unit is null)
            return false;

        _context.Units.Remove(unit);
        await _context.SaveChangesAsync();

        return true;
    }
}