using System.Security.Claims;
using backend.Constants;
using backend.DTOs.Building;
using backend.Services.Buildings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BuildingsController : ControllerBase
{
    private readonly IBuildingService _buildingService;
    public BuildingsController(IBuildingService buildingService)
    {
        _buildingService = buildingService;
    }
    [HttpPost("/api/condominiums/{condominiumId}/buildings")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create(int condominiumId, [FromBody] CreateBuildingDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var building = await _buildingService.CreateAsync(userId, condominiumId, dto);

        return CreatedAtAction(nameof(GetById), new { buildingId = building.Id }, building);
    }

    [HttpGet("/api/condominiums/{condominiumId}/buildings")]
    public async Task<IActionResult> GetAll(int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var buildings = await _buildingService.GetByCondominiumAsync(userId, condominiumId);

        return Ok(buildings);
    }

    [HttpGet("{buildingId}")]
    public async Task<IActionResult> GetById(int buildingId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var building = await _buildingService.GetByIdAsync(userId, buildingId);

        if (building is null)
            return NotFound();

        return Ok(building);
    }

    [HttpPut("{buildingId}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update(int buildingId, [FromBody] UpdateBuildingDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var updated = await _buildingService.UpdateAsync(userId, buildingId, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{buildingId}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(int buildingId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var deleted = await _buildingService.DeleteAsync(userId, buildingId);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}