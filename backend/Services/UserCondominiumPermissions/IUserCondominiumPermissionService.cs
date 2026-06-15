using backend.DTOs.Permissions;

namespace backend.Services.UserCondominiumPermissions;

public interface IUserCondominiumPermissionService
{
    Task<UserCondominiumPermissionsResponseDto> GetAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId);

    Task<UserCondominiumPermissionsResponseDto> UpdateAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId,
        UpdateUserCondominiumPermissionsDto dto);
}
