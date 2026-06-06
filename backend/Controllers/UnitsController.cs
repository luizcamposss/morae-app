using System.Security.Claims;
using backend.Constants;
using backend.DTOs.Unit;
using backend.Services.Units;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UnitsController : ControllerBase
{
    private readonly IUnitService _unitService;
    public UnitsController(IUnitService unitService)
    {
        _unitService = unitService;
    }
    [HttpPost("/api/buildings/{buildingId}/units")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create([FromRoute] int buildingId, [FromBody] CreateUnitDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var unit = await _unitService.CreateAsync(userId, buildingId, dto);

        return CreatedAtAction(nameof(GetById), new { unitId = unit.Id }, unit);
    }

    [HttpGet("/api/buildings/{buildingId}/units")]
    public async Task<IActionResult> GetAll([FromRoute] int buildingId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var units = await _unitService.GetByBuildingAsync(userId, buildingId);

        return Ok(units);
    }

    [HttpGet("{unitId}")]
    public async Task<IActionResult> GetById([FromRoute] int unitId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var unit = await _unitService.GetByIdAsync(userId, unitId);

        if (unit is null)
            return NotFound();

        return Ok(unit);
    }

    [HttpPut("{unitId}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update([FromRoute] int unitId, [FromBody] UpdateUnitDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var updated = await _unitService.UpdateAsync(userId, unitId, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{unitId}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete([FromRoute] int unitId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var deleted = await _unitService.DeleteAsync(userId, unitId);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}