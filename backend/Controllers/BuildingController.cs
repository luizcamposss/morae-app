using backend.Constants;
using backend.DTOs.Building;
using backend.Services.Buildings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[Controller]")]
[Authorize]
public class BuildingsController : ControllerBase
{
    private readonly IBuildingService _buildingService;
    public BuildingsController(IBuildingService buildingService)
    {
        _buildingService = buildingService;
    }

    [HttpPost("/api/condominiums/{condominiumId}/buildings")]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Create(int condominiumId, [FromBody] CreateBuildingDto dto)
    {
        var building = await _buildingService.CreateAsync(condominiumId, dto);

        return CreatedAtAction(nameof(GetById), new { id = building.Id }, building);
    }

    [HttpGet("/api/condominiums/{condominiumId}/buildings")]
    public async Task<IActionResult> GetAll(int condominiumId)
    {
        var buildings = await _buildingService
            .GetByCondominiumAsync(condominiumId);

        return Ok(buildings);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var building = await _buildingService
            .GetByIdAsync(id);

        if (building is null)
            return NotFound();

        return Ok(building);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBuildingDto dto)
    {
        var updated = await _buildingService
            .UpdateAsync(id, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _buildingService
            .DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}