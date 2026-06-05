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
    [Authorize(Roles = $"{AppRoles.Admin}")]
    public async Task<IActionResult> Create([FromRoute] int buildingId, [FromBody] CreateUnitDto dto)
    {
        var unit = await _unitService.CreateAsync(buildingId, dto);

        return CreatedAtAction(nameof(GetById), new { id = unit.Id }, unit);
    }

    [HttpGet("/api/buildings/{buildingId}/units")]
    public async Task<IActionResult> GetAll([FromRoute] int buildingId)
    {
        var units = await _unitService
            .GetByBuildingAsync(buildingId);

        return Ok(units);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var unit = await _unitService
            .GetByIdAsync(id);

        if (unit is null)
            return NotFound();

        return Ok(unit);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = $"{AppRoles.Admin}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateUnitDto dto)
    {
        var updated = await _unitService
            .UpdateAsync(id, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = $"{AppRoles.Admin}")]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        var deleted = await _unitService
            .DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
