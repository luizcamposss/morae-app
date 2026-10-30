using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.DTOs.Charge;
using backend.Services.Charges;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ChargesController : ControllerBase
{
    private readonly IChargeService _chargeService;

    public ChargesController(IChargeService chargeService)
    {
        _chargeService = chargeService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateChargeDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var charge = await _chargeService.CreateAsync(userId, dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = charge.Id },
            charge);
    }

    [HttpGet("platform")]
    public async Task<IActionResult> GetPlatform()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var charges = await _chargeService.GetPlatformAsync(userId);

        return Ok(charges);
    }

    [HttpGet("/api/condominiums/{condominiumId}/charges")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var charges = await _chargeService.GetByCondominiumAsync(userId, condominiumId);

        return Ok(charges);
    }

    [HttpGet("/api/my/charges")]
    public async Task<IActionResult> GetMine()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var charges = await _chargeService.GetMineAsync(userId);

        return Ok(charges);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var charge = await _chargeService.GetByIdAsync(userId, id);

        if (charge is null)
            return NotFound();

        return Ok(charge);
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(
        [FromRoute] int id,
        [FromBody] CancelChargeDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var canceled = await _chargeService.CancelAsync(userId, id, dto);

        if (!canceled)
            return NotFound();

        return NoContent();
    }
}