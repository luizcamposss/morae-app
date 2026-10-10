using System.Security.Claims;
using backend.DTOs.Maintenance;
using backend.Enums;
using backend.Services.Maintenance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class MaintenancePlansController : ControllerBase
{
    private readonly IMaintenancePlanService _maintenancePlanService;

    public MaintenancePlansController(IMaintenancePlanService maintenancePlanService)
    {
        _maintenancePlanService = maintenancePlanService;
    }

    [HttpPost("api/condominiums/{condominiumId}/maintenance-plans")]
    public async Task<IActionResult> Create([FromRoute] int condominiumId, [FromBody] SaveMaintenancePlanDto dto)
    {
        var plan = await _maintenancePlanService.CreateAsync(GetUserId(), condominiumId, dto);

        return StatusCode(StatusCodes.Status201Created, plan);
    }

    [HttpGet("api/condominiums/{condominiumId}/maintenance-plans")]
    public async Task<IActionResult> GetByCondominium(
        [FromRoute] int condominiumId,
        [FromQuery] MaintenanceStatus? status,
        [FromQuery] int? buildingId)
    {
        return Ok(await _maintenancePlanService.GetByCondominiumAsync(GetUserId(), condominiumId, status, buildingId));
    }

    [HttpGet("api/maintenance-plans/{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        return Ok(await _maintenancePlanService.GetByIdAsync(GetUserId(), id));
    }

    [HttpPut("api/maintenance-plans/{id}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] SaveMaintenancePlanDto dto)
    {
        return Ok(await _maintenancePlanService.UpdateAsync(GetUserId(), id, dto));
    }

    [HttpDelete("api/maintenance-plans/{id}")]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        await _maintenancePlanService.DeleteAsync(GetUserId(), id);

        return NoContent();
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
