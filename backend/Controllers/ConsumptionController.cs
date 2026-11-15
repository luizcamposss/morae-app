using System.Security.Claims;
using backend.DTOs.Consumption;
using backend.Enums;
using backend.Services.Consumption;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Individual meters (module "Consumo"): prices, monthly readings and the residents' history.
[ApiController]
[Authorize]
public class ConsumptionController : ControllerBase
{
    private readonly IConsumptionService _consumptionService;

    public ConsumptionController(IConsumptionService consumptionService)
    {
        _consumptionService = consumptionService;
    }

    [HttpGet("api/condominiums/{condominiumId}/utility-rates")]
    public async Task<IActionResult> GetRates([FromRoute] int condominiumId) =>
        Ok(await _consumptionService.GetRatesAsync(GetUserId(), condominiumId));

    [HttpPut("api/condominiums/{condominiumId}/utility-rates")]
    public async Task<IActionResult> SaveRates([FromRoute] int condominiumId, [FromBody] SaveUtilityRatesDto dto) =>
        Ok(await _consumptionService.SaveRatesAsync(GetUserId(), condominiumId, dto));

    [HttpGet("api/condominiums/{condominiumId}/readings")]
    public async Task<IActionResult> GetMonth([FromRoute] int condominiumId, [FromQuery] string? month, [FromQuery] ChargeCategory category = ChargeCategory.Water) =>
        Ok(await _consumptionService.GetMonthAsync(GetUserId(), condominiumId, month, category));

    [HttpPost("api/condominiums/{condominiumId}/readings")]
    public async Task<IActionResult> Save([FromRoute] int condominiumId, [FromBody] SaveReadingsDto dto) =>
        Ok(await _consumptionService.SaveReadingsAsync(GetUserId(), condominiumId, dto));

    [HttpGet("api/my/consumption")]
    public async Task<IActionResult> GetMine() => Ok(await _consumptionService.GetMineAsync(GetUserId()));

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
