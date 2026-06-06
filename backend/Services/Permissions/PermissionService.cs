using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Permissions;

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _context;
    public PermissionService(AppDbContext context)
    {
        _context = context;
    }
    public async Task<bool> HasCondominiumAccessAsync(int userId, int condominiumId)
    {
        return await _context.UserCondominiums
            .AnyAsync(uc =>
                uc.UserId == userId &&
                uc.CondominiumId == condominiumId);
    }
    public async Task<bool> HasBuildingAccessAsync(int userId, int buildingId)
    {
        var building = await _context.Buildings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building is null)
            return false;

        return await HasCondominiumAccessAsync(userId, building.CondominiumId);
    }
    public async Task<bool> HasUnitAccessAsync(int userId, int unitId)
    {
        var unit = await _context.Units
            .AsNoTracking()
            .Include(u => u.Building)
            .FirstOrDefaultAsync(u => u.Id == unitId);

        if (unit is null)
            return false;

        return await HasCondominiumAccessAsync(userId, unit.Building.CondominiumId);
    }
}