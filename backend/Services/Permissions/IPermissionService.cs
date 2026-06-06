using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Services.Permissions;

public interface IPermissionService
{
    Task<bool> HasCondominiumAccessAsync(int userId, int condominiumId);
    Task<bool> HasBuildingAccessAsync(int userId, int buildingId);
    Task<bool> HasUnitAccessAsync(int userId, int unitId);
}