using System.Security.Claims;
using backend.DTOs.Condominium;
using backend.Services.Condominium;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Which modules the condominium uses (Admin only). The type itself is set by the Master.
[ApiController]
[Authorize]
[Route("api/condominiums/{condominiumId}/modules")]
public class CondominiumModulesController : ControllerBase
{
    private readonly ICondominiumService _condominiumService;

    public CondominiumModulesController(ICondominiumService condominiumService)
    {
        _condominiumService = condominiumService;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromRoute] int condominiumId)
    {
        return Ok(await _condominiumService.GetModulesAsync(GetUserId(), condominiumId));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromRoute] int condominiumId, [FromBody] UpdateCondominiumModulesDto dto)
    {
        return Ok(await _condominiumService.UpdateModulesAsync(GetUserId(), condominiumId, dto));
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
