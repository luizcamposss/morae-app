using backend.DTOs.Permissions;

namespace backend.Services.UserCondominiumPermissions;

public interface IUserCondominiumPermissionService
{
    Task<UserCondominiumPermissionsResponseDto> GetAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId);

    Task<SyndicBuildingsResponseDto> GetBuildingsAsync(int requesterUserId, int condominiumId, int targetUserId);
    Task<SyndicBuildingsResponseDto> UpdateBuildingsAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId,
        UpdateSyndicBuildingsDto dto);
    Task<UserCondominiumPermissionsResponseDto> UpdateAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId,
        UpdateUserCondominiumPermissionsDto dto);
}
