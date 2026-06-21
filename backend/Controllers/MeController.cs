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
}