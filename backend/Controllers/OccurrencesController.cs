using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.DTOs.Occurrence;
using backend.Services.Occurrences;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class OccurrencesController : ControllerBase
{
    private readonly IOccurrenceService _occurrenceService;

    public OccurrencesController(IOccurrenceService occurrenceService)
    {
        _occurrenceService = occurrenceService;
    }

    [HttpPost("api/occurrences")]
    public async Task<IActionResult> Create([FromBody] CreateOccurrenceDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrence = await _occurrenceService.CreateAsync(userId, dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = occurrence.Id },
            occurrence);
    }

    [HttpGet("api/condominiums/{condominiumId}/occurrences")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrences = await _occurrenceService.GetByCondominiumAsync(userId, condominiumId);

        return Ok(occurrences);
    }

    [HttpGet("api/my/occurrences")]
    public async Task<IActionResult> GetMine()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrences = await _occurrenceService.GetMineAsync(userId);

        return Ok(occurrences);
    }

    [HttpGet("api/occurrences/{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrence = await _occurrenceService.GetByIdAsync(userId, id);

        if (occurrence is null)
            return NotFound();

        return Ok(occurrence);
    }

    [HttpPut("api/occurrences/{id}/status")]
    public async Task<IActionResult> UpdateStatus(
        [FromRoute] int id,
        [FromBody] UpdateOccurrenceDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var updated = await _occurrenceService.UpdateStatusAsync(userId, id, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }
}