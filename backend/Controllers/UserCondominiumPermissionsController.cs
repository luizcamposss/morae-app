using System.Security.Claims;
using backend.Constants;
using backend.DTOs.Permissions;
using backend.Services.UserCondominiumPermissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.Admin)]
public class UserCondominiumPermissionsController : ControllerBase
{
    private readonly IUserCondominiumPermissionService _permissionService;

    public UserCondominiumPermissionsController(IUserCondominiumPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    [HttpGet("api/condominiums/{condominiumId}/syndics/{userId}/permissions")]
    public async Task<IActionResult> Get(
        [FromRoute] int condominiumId,
        [FromRoute] int userId)
    {
        var requesterUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var permissions = await _permissionService.GetAsync(
            requesterUserId,
            condominiumId,
            userId);

        return Ok(permissions);
    }

    [HttpPut("api/condominiums/{condominiumId}/syndics/{userId}/permissions")]
    public async Task<IActionResult> Update(
        [FromRoute] int condominiumId,
        [FromRoute] int userId,
        [FromBody] UpdateUserCondominiumPermissionsDto dto)
    {
        var requesterUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var permissions = await _permissionService.UpdateAsync(
            requesterUserId,
            condominiumId,
            userId,
            dto);

        return Ok(permissions);
    }
}
