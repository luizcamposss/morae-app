using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Services.Permissions;

public interface IPermissionService
{
    Task<bool> IsMasterAsync(int userId);
    Task<bool> IsAdminAsync(int userId);
    Task<bool> IsSyndicAsync(int userId);
    Task<bool> IsResidentAsync(int userId);
    Task<bool> IsCondominiumAdminAsync(int userId, int condominiumId);

    Task<bool> HasCondominiumAccessAsync(int userId, int condominiumId);
    Task<bool> HasBuildingAccessAsync(int userId, int buildingId);
    Task<bool> HasUnitAccessAsync(int userId, int unitId);
    Task<bool> HasPersonAccessAsync(int userId, int personId);
    Task<bool> HasCondominiumPermissionAsync(int userId, int condominiumId, string permissionKey);

    Task EnsureMasterAsync(int userId);
    Task EnsureCondominiumAdminAsync(int userId, int condominiumId);
    Task EnsureCondominiumAccessAsync(int userId, int condominiumId);
    Task EnsureBuildingAccessAsync(int userId, int buildingId);
    Task EnsureUnitAccessAsync(int userId, int unitId);
    Task EnsurePersonAccessAsync(int userId, int personId);
    Task EnsureCondominiumPermissionAsync(int userId, int condominiumId, string permissionKey);

    // The user's active role in that condominium (Admin, Syndic, Resident) or null. Roles are per
    // condominium: being Syndic in one condominium says nothing about another.
    Task<string?> GetCondominiumRoleAsync(int userId, int condominiumId);

    // Buildings whose data the user may manage in that condominium: null = all of them
    // (Admins, and syndics set to manage all buildings); empty = none.
    Task<IReadOnlyCollection<int>?> GetManagedBuildingIdsAsync(int userId, int condominiumId);
    Task<bool> IsUnitResidentAsync(int userId, int unitId);
    Task<bool> IsPlatformBillingAdminAsync(int userId, int condominiumId);
    Task<bool> HasAnyCondominiumPermissionAsync(int userId, int condominiumId, IEnumerable<string> permissionKeys);
    Task EnsureAnyCondominiumPermissionAsync(int userId, int condominiumId, IEnumerable<string> permissionKeys);
    Task EnsureCanReadCondominiumChargeAsync(int userId, int condominiumId, int? unitId);
}
