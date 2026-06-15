using backend.Constants;
using backend.Data;
using backend.Exceptions;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Permissions;

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public PermissionService(AppDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<bool> IsMasterAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return false;

        return await _userManager.IsInRoleAsync(user, AppRoles.Master);
    }

    public async Task EnsureMasterAsync(int userId)
    {
        var isMaster = await IsMasterAsync(userId);

        if (!isMaster)
            throw new ForbiddenException("Only Master can perform this action.");
    }

    public async Task<bool> HasCondominiumAccessAsync(int userId, int condominiumId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return false;

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
            return true;

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
    public async Task<bool> HasPersonAccessAsync(int userId, int personId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return false;

        var personExists = await _context.Persons
            .AsNoTracking()
            .AnyAsync(p => p.Id == personId);

        if (!personExists)
            return false;

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
            return true;

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            return await _context.PersonUnits
                .AsNoTracking()
                .AnyAsync(pu =>
                    pu.PersonId == personId &&
                    _context.UserCondominiums.Any(uc =>
                        uc.UserId == userId &&
                        uc.CondominiumId == pu.Unit.Building.CondominiumId));
        }

        return user.PersonId == personId;
    }
    public async Task EnsureCondominiumAccessAsync(int userId, int condominiumId)
    {
        var hasAccess = await HasCondominiumAccessAsync(userId, condominiumId);

        if (!hasAccess)
            throw new ForbiddenException("You do not have access to this condominium.");
    }

    public async Task EnsureBuildingAccessAsync(int userId, int buildingId)
    {
        var hasAccess = await HasBuildingAccessAsync(userId, buildingId);

        if (!hasAccess)
            throw new ForbiddenException("You do not have access to this building.");
    }

    public async Task EnsureUnitAccessAsync(int userId, int unitId)
    {
        var hasAccess = await HasUnitAccessAsync(userId, unitId);

        if (!hasAccess)
            throw new ForbiddenException("You do not have access to this unit.");
    }

    public async Task EnsurePersonAccessAsync(int userId, int personId)
    {
        var hasAccess = await HasPersonAccessAsync(userId, personId);

        if (!hasAccess)
            throw new ForbiddenException("You do not have access to this person.");
    }
}
