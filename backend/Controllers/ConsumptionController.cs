using System.Security.Claims;
using backend.DTOs.Consumption;
using backend.Services.Consumption;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Water, light and gas per unit (module "Consumo"): monthly amounts in R$ and the residents' history.
[ApiController]
[Authorize]
public class ConsumptionController : ControllerBase
{
    private readonly IConsumptionService _consumptionService;

    public ConsumptionController(IConsumptionService consumptionService)
    {
        _consumptionService = consumptionService;
    }

    [HttpGet("api/condominiums/{condominiumId}/utilities")]
    public async Task<IActionResult> GetMonth([FromRoute] int condominiumId, [FromQuery] string? month) =>
        Ok(await _consumptionService.GetMonthAsync(GetUserId(), condominiumId, month));

    [HttpPost("api/condominiums/{condominiumId}/utilities")]
    public async Task<IActionResult> SaveMonth([FromRoute] int condominiumId, [FromBody] SaveUtilitiesDto dto) =>
        Ok(await _consumptionService.SaveMonthAsync(GetUserId(), condominiumId, dto));

    [HttpPut("api/condominiums/{condominiumId}/utilities/settings")]
    public async Task<IActionResult> SaveSettings([FromRoute] int condominiumId, [FromBody] UtilitySettingsDto dto) =>
        Ok(await _consumptionService.SaveSettingsAsync(GetUserId(), condominiumId, dto));

    [HttpGet("api/my/consumption")]
    public async Task<IActionResult> GetMine() => Ok(await _consumptionService.GetMineAsync(GetUserId()));

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
