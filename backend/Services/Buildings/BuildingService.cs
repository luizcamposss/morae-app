using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Data;
using backend.DTOs.Building;
using backend.Models;
using backend.Services.Buildings;
using Microsoft.EntityFrameworkCore;
public class BuildingService : IBuildingService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public BuildingService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }
    public async Task<BuildingResponseDto> CreateAsync(int condominiumId, CreateBuildingDto dto)
    {
        var condominiumExists = await _context.Condominiums.AnyAsync(c => c.Id == condominiumId);

        if (!condominiumExists)
        {
            throw new Exception("Condominium not found");
        }

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


    public async Task<IEnumerable<BuildingResponseDto>> GetByCondominiumAsync(int condominiumId)
    {
        var condominiumExists = await _context.Condominiums.AnyAsync(c => c.Id == condominiumId);

        if (!condominiumExists)
        {
            throw new Exception("Condominium wasn't registered");
        }

        var buildings = await _context.Buildings
            .AsNoTracking()
            .Where(c => c.CondominiumId == condominiumId)
            .ToListAsync();

        return _mapper.Map<IEnumerable<BuildingResponseDto>>(buildings);
    }

    public async Task<BuildingResponseDto?> GetByIdAsync(int id)
    {
        var building = await _context.Buildings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id);

        if (building is null)
            return null;

        return _mapper.Map<BuildingResponseDto>(building);
    }

    public async Task<bool> UpdateAsync(int id, UpdateBuildingDto dto)
    {
        var building = await _context.Buildings
            .FirstOrDefaultAsync(b => b.Id == id);

        if (building == null)
            return false;

        var codeExists = await _context.Buildings
            .AnyAsync(b =>
                b.CondominiumId == building.CondominiumId &&
                b.Code == dto.Code &&
                b.Id != id);

        if (codeExists)
            throw new Exception("Building code already exists in this condominium.");

        _mapper.Map(dto, building);

        building.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
    public async Task<bool> DeleteAsync(int id)
    {
        var building = await _context.Buildings
            .FirstOrDefaultAsync(b => b.Id == id);

        if (building is null)
            return false;

        _context.Buildings.Remove(building);
        await _context.SaveChangesAsync();

        return true;
    }
}