using System.Security.Claims;
using backend.DTOs.Assembly;
using backend.Services.Assemblies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class AssembliesController : ControllerBase
{
    private readonly IAssemblyService _assemblyService;

    public AssembliesController(IAssemblyService assemblyService)
    {
        _assemblyService = assemblyService;
    }

    [HttpPost("api/condominiums/{condominiumId}/assemblies")]
    public async Task<IActionResult> Create([FromRoute] int condominiumId, [FromBody] SaveAssemblyDto dto)
    {
        var assembly = await _assemblyService.CreateAsync(GetUserId(), condominiumId, dto);

        return StatusCode(StatusCodes.Status201Created, assembly);
    }

    [HttpGet("api/condominiums/{condominiumId}/assemblies")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        return Ok(await _assemblyService.GetByCondominiumAsync(GetUserId(), condominiumId));
    }

    [HttpGet("api/assemblies/{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        return Ok(await _assemblyService.GetByIdAsync(GetUserId(), id));
    }

    [HttpPut("api/assemblies/{id}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] SaveAssemblyDto dto)
    {
        return Ok(await _assemblyService.UpdateAsync(GetUserId(), id, dto));
    }

    [HttpDelete("api/assemblies/{id}")]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        await _assemblyService.DeleteAsync(GetUserId(), id);

        return NoContent();
    }

    [HttpPost("api/assemblies/{id}/publish")]
    public async Task<IActionResult> Publish([FromRoute] int id)
    {
        return Ok(await _assemblyService.PublishAsync(GetUserId(), id));
    }

    [HttpPost("api/assemblies/{id}/cancel")]
    public async Task<IActionResult> Cancel([FromRoute] int id, [FromBody] CancelAssemblyDto dto)
    {
        return Ok(await _assemblyService.CancelAsync(GetUserId(), id, dto));
    }

    // The units the user can vote for and their current votes.
    [HttpGet("api/assemblies/{id}/my-ballot")]
    public async Task<IActionResult> GetMyBallot([FromRoute] int id)
    {
        return Ok(await _assemblyService.GetMyBallotAsync(GetUserId(), id));
    }

    // Votes (or changes the votes) of one unit; items left out keep their current vote.
    [HttpPut("api/assemblies/{id}/votes")]
    public async Task<IActionResult> CastVotes([FromRoute] int id, [FromBody] CastVotesDto dto)
    {
        return Ok(await _assemblyService.CastVotesAsync(GetUserId(), id, dto));
    }

    // Final results after voting ends; while open, the management sees only participation.
    [HttpGet("api/assemblies/{id}/results")]
    public async Task<IActionResult> GetResults([FromRoute] int id)
    {
        return Ok(await _assemblyService.GetResultsAsync(GetUserId(), id));
    }

    // Links the signed minutes (a document already published in Documents).
    [HttpPut("api/assemblies/{id}/minutes")]
    public async Task<IActionResult> SetMinutes([FromRoute] int id, [FromBody] SetMinutesDto dto)
    {
        return Ok(await _assemblyService.SetMinutesAsync(GetUserId(), id, dto));
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
