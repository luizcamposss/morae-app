using System.Security.Claims;
using backend.DTOs.Agreement;
using backend.Services.Agreements;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Debt agreements: overdue charges of a unit renegotiated into a down payment and installments.
[ApiController]
[Authorize]
[Route("api")]
public class AgreementsController : ControllerBase
{
    private readonly IAgreementService _agreementService;

    public AgreementsController(IAgreementService agreementService)
    {
        _agreementService = agreementService;
    }

    [HttpGet("condominiums/{condominiumId}/agreements")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        return Ok(await _agreementService.GetByCondominiumAsync(GetUserId(), condominiumId));
    }

    [HttpPost("condominiums/{condominiumId}/agreements")]
    public async Task<IActionResult> Create(
        [FromRoute] int condominiumId,
        [FromBody] CreateAgreementDto dto)
    {
        var agreement = await _agreementService.CreateAsync(GetUserId(), condominiumId, dto);

        return CreatedAtAction(nameof(GetById), new { id = agreement.Id }, agreement);
    }

    [HttpGet("my/agreements")]
    public async Task<IActionResult> GetMine()
    {
        return Ok(await _agreementService.GetMineAsync(GetUserId()));
    }

    [HttpGet("agreements/{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        return Ok(await _agreementService.GetByIdAsync(GetUserId(), id));
    }

    [HttpPut("agreements/{id}/cancel")]
    public async Task<IActionResult> Cancel(
        [FromRoute] int id,
        [FromBody] CancelAgreementDto dto)
    {
        return Ok(await _agreementService.CancelAsync(GetUserId(), id, dto));
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
