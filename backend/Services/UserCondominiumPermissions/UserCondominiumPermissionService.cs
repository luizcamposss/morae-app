using backend.Constants;
using backend.Data;
using backend.DTOs.Permissions;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.UserCondominiumPermissions;

public class UserCondominiumPermissionService : IUserCondominiumPermissionService
{
    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;

    public UserCondominiumPermissionService(
        AppDbContext context,
        IPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<UserCondominiumPermissionsResponseDto> GetAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId)
    {
        await _permissionService.EnsureCondominiumAdminAsync(requesterUserId, condominiumId);

        var userCondominium = await GetSyndicUserCondominiumAsync(condominiumId, targetUserId);

        return MapResponse(userCondominium);
    }

    public async Task<UserCondominiumPermissionsResponseDto> UpdateAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId,
        UpdateUserCondominiumPermissionsDto dto)
    {
        await _permissionService.EnsureCondominiumAdminAsync(requesterUserId, condominiumId);

        var requestedPermissions = dto.Permissions
            .Distinct()
            .ToList();

        var invalidPermissions = requestedPermissions
            .Where(permission => !AppPermissions.All.Contains(permission))
            .ToList();

        if (invalidPermissions.Count > 0)
            throw new BadRequestException($"Invalid permissions: {string.Join(", ", invalidPermissions)}");

        var userCondominium = await GetSyndicUserCondominiumAsync(condominiumId, targetUserId);

        _context.UserCondominiumPermissions.RemoveRange(userCondominium.Permissions);

        userCondominium.Permissions = requestedPermissions
            .Select(permission => new UserCondominiumPermission
            {
                UserCondominiumId = userCondominium.Id,
                PermissionKey = permission,
                CreatedAt = DateTime.UtcNow
            })
            .ToList();

        await _context.SaveChangesAsync();

        return MapResponse(userCondominium);
    }

    private async Task<UserCondominium> GetSyndicUserCondominiumAsync(
        int condominiumId,
        int targetUserId)
    {
        var userCondominium = await _context.UserCondominiums
            .Include(uc => uc.Permissions)
            .FirstOrDefaultAsync(uc =>
                uc.UserId == targetUserId &&
                uc.CondominiumId == condominiumId);

        if (userCondominium is null)
            throw new NotFoundException("User does not belong to this condominium.");

        if (userCondominium.Role != AppRoles.Syndic)
            throw new BadRequestException("Permissions can only be managed for syndic users.");

        return userCondominium;
    }

    private static UserCondominiumPermissionsResponseDto MapResponse(UserCondominium userCondominium)
    {
        return new UserCondominiumPermissionsResponseDto
        {
            UserId = userCondominium.UserId,
            CondominiumId = userCondominium.CondominiumId,
            Role = userCondominium.Role,
            Permissions = userCondominium.Permissions
                .Select(permission => permission.PermissionKey)
                .OrderBy(permission => permission)
                .ToList()
        };
    }
}
