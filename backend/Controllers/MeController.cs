using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.Services.Me;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MeController : ControllerBase
{
    private readonly IMeService _meService;

    public MeController(IMeService meService)
    {
        _meService = meService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMe()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var me = await _meService.GetMeAsync(userId);

        return Ok(me);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] DTOs.Me.UpdateMyProfileDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var me = await _meService.UpdateMyProfileAsync(userId, dto);

        return Ok(me);
    }

    [HttpPut("profile-photo")]
    public async Task<IActionResult> UpdateProfilePhoto([FromBody] DTOs.Me.UpdateProfilePhotoDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var me = await _meService.UpdateProfilePhotoAsync(userId, dto);

        return Ok(me);
    }

    [HttpGet("notification-preferences")]
    public async Task<IActionResult> GetNotificationPreferences()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var preferences = await _meService.GetNotificationPreferencesAsync(userId);

        return Ok(preferences);
    }

    [HttpPut("notification-preferences")]
    public async Task<IActionResult> UpdateNotificationPreferences(
        [FromBody] DTOs.Me.NotificationPreferencesDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var preferences = await _meService.UpdateNotificationPreferencesAsync(userId, dto);

        return Ok(preferences);
    }

    [HttpGet("condominiums")]
    public async Task<IActionResult> GetMyCondominiums()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var condominiums = await _meService.GetMyCondominiumsAsync(userId);

        return Ok(condominiums);
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetMyPermissions([FromQuery] int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var permissions = await _meService.GetMyPermissionsAsync(userId, condominiumId);

        return Ok(permissions);
    }
    
    [HttpGet("units")]
    public async Task<IActionResult> GetMyUnits()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var units = await _meService.GetMyUnitsAsync(userId);

        return Ok(units);
    }
}
