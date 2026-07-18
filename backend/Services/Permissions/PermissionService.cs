using backend.Constants;
using backend.Data;
using backend.Enums;
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

    public async Task<bool> IsAdminAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return false;

        return await _userManager.IsInRoleAsync(user, AppRoles.Admin);
    }

    public async Task<bool> IsSyndicAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return false;

        return await _userManager.IsInRoleAsync(user, AppRoles.Syndic);
    }

    public async Task<bool> IsResidentAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return false;

        return await _userManager.IsInRoleAsync(user, AppRoles.Resident);
    }

    public async Task<bool> IsCondominiumAdminAsync(int userId, int condominiumId)
    {
        return await _context.UserCondominiums
            .AsNoTracking()
            .AnyAsync(uc =>
                uc.UserId == userId &&
                uc.CondominiumId == condominiumId &&
                uc.Role == AppRoles.Admin &&
                uc.Status == UserCondominiumStatus.Active);
    }

    public async Task EnsureMasterAsync(int userId)
    {
        var isMaster = await IsMasterAsync(userId);

        if (!isMaster)
            throw new ForbiddenException("Only Master can perform this action.");
    }

    public async Task EnsureCondominiumAdminAsync(int userId, int condominiumId)
    {
        var isCondominiumAdmin = await IsCondominiumAdminAsync(userId, condominiumId);

        if (!isCondominiumAdmin)
            throw new ForbiddenException("Only condominium admins can perform this action.");
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
                uc.CondominiumId == condominiumId &&
                uc.Status == UserCondominiumStatus.Active);
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

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
            return true;

        var personExists = await _context.Persons
            .AsNoTracking()
            .AnyAsync(p => p.Id == personId);

        if (!personExists)
            return false;

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin) ||
            await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
        {
            return await _context.PersonUnits
                .AsNoTracking()
                .AnyAsync(pu =>
                    pu.PersonId == personId &&
                    _context.UserCondominiums.Any(uc =>
                        uc.UserId == userId &&
                        uc.CondominiumId == pu.Unit.Building.CondominiumId &&
                        uc.Status == UserCondominiumStatus.Active));
        }

        return user.PersonId == personId;
    }

    public async Task<bool> HasCondominiumPermissionAsync(int userId, int condominiumId, string permissionKey)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return false;

        var userCondominium = await _context.UserCondominiums
            .AsNoTracking()
            .FirstOrDefaultAsync(uc =>
                uc.UserId == userId &&
                uc.CondominiumId == condominiumId &&
                uc.Status == UserCondominiumStatus.Active);

        if (userCondominium is null)
            return false;

        if (userCondominium.Role == AppRoles.Admin)
            return true;

        if (userCondominium.Role != AppRoles.Syndic)
            return false;

        return await _context.UserCondominiumPermissions
            .AsNoTracking()
            .AnyAsync(p =>
                p.UserCondominiumId == userCondominium.Id &&
                p.PermissionKey == permissionKey);
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

    public async Task EnsureCondominiumPermissionAsync(int userId, int condominiumId, string permissionKey)
    {
        var hasPermission = await HasCondominiumPermissionAsync(userId, condominiumId, permissionKey);

        if (!hasPermission)
            throw new ForbiddenException("You do not have permission to perform this action.");
    }
}
