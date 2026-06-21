using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.Services.Delinquency;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class DelinquencyController : ControllerBase
{
    private readonly IDelinquencyService _delinquencyService;

    public DelinquencyController(IDelinquencyService delinquencyService)
    {
        _delinquencyService = delinquencyService;
    }

    [HttpGet("api/delinquency/platform")]
    public async Task<IActionResult> GetPlatform()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var delinquency = await _delinquencyService.GetPlatformAsync(userId);

        return Ok(delinquency);
    }

    [HttpGet("api/condominiums/{condominiumId}/delinquency")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var delinquency = await _delinquencyService.GetByCondominiumAsync(userId, condominiumId);

        return Ok(delinquency);
    }
}