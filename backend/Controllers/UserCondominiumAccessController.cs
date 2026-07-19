using System.Security.Claims;
using backend.DTOs.UserCondominiumAccess;
using backend.Services.UserCondominiumAccess;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class UserCondominiumAccessController : ControllerBase
{
    private readonly IUserCondominiumAccessService _userCondominiumAccessService;

    public UserCondominiumAccessController(IUserCondominiumAccessService userCondominiumAccessService)
    {
        _userCondominiumAccessService = userCondominiumAccessService;
    }

    [HttpGet("api/master/users")]
    public async Task<IActionResult> GetMasterUsers()
    {
        var requesterUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var users = await _userCondominiumAccessService.GetMasterUsersAsync(requesterUserId);

        return Ok(users);
    }

    [HttpPut("api/condominiums/{condominiumId}/users/{userId}/suspend")]
    public async Task<IActionResult> Suspend(
        [FromRoute] int condominiumId,
        [FromRoute] int userId,
        [FromBody] SuspendUserCondominiumDto dto)
    {
        var requesterUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _userCondominiumAccessService.SuspendAsync(
            requesterUserId,
            condominiumId,
            userId,
            dto);

        return Ok(result);
    }

    [HttpPut("api/condominiums/{condominiumId}/users/{userId}/reactivate")]
    public async Task<IActionResult> Reactivate(
        [FromRoute] int condominiumId,
        [FromRoute] int userId)
    {
        var requesterUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _userCondominiumAccessService.ReactivateAsync(
            requesterUserId,
            condominiumId,
            userId);

        return Ok(result);
    }



}
