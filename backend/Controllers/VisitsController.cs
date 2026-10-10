using System.Security.Claims;
using backend.DTOs.Visit;
using backend.Enums;
using backend.Services.Visits;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class VisitsController : ControllerBase
{
    private readonly IVisitService _visitService;

    public VisitsController(IVisitService visitService)
    {
        _visitService = visitService;
    }

    [HttpPost("api/condominiums/{condominiumId}/visits")]
    public async Task<IActionResult> Create([FromRoute] int condominiumId, [FromBody] SaveVisitDto dto)
    {
        var visit = await _visitService.CreateAsync(GetUserId(), condominiumId, dto);

        return StatusCode(StatusCodes.Status201Created, visit);
    }

    // The visits of the user's units (and the ones they created).
    [HttpGet("api/condominiums/{condominiumId}/my-visits")]
    public async Task<IActionResult> GetMine([FromRoute] int condominiumId, [FromQuery] bool includePast = false)
    {
        return Ok(await _visitService.GetMineAsync(GetUserId(), condominiumId, includePast));
    }

    // Management agenda; without dates, today. Up to 31 days per request.
    [HttpGet("api/condominiums/{condominiumId}/visits")]
    public async Task<IActionResult> GetAgenda(
        [FromRoute] int condominiumId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int? unitId,
        [FromQuery] int? buildingId,
        [FromQuery] VisitorType? visitorType,
        [FromQuery] bool includeCanceled = false)
    {
        return Ok(await _visitService.GetAgendaAsync(
            GetUserId(), condominiumId, from, to, unitId, buildingId, visitorType, includeCanceled));
    }

    [HttpPut("api/visits/{id}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] SaveVisitDto dto)
    {
        return Ok(await _visitService.UpdateAsync(GetUserId(), id, dto));
    }

    [HttpPost("api/visits/{id}/cancel")]
    public async Task<IActionResult> Cancel([FromRoute] int id)
    {
        return Ok(await _visitService.CancelAsync(GetUserId(), id));
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
