using System.Security.Claims;
using backend.DTOs.Charge;
using backend.DTOs.Condominium;
using backend.Services.Charges;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Batch and recurring charges, and the condominium's billing rules (due day, fine, interest).
[ApiController]
[Authorize]
[Route("api")]
public class ChargeBillingController : ControllerBase
{
    private readonly IChargeService _chargeService;
    private readonly IChargeBillingService _billingService;

    public ChargeBillingController(IChargeService chargeService, IChargeBillingService billingService)
    {
        _chargeService = chargeService;
        _billingService = billingService;
    }

    [HttpGet("condominiums/{condominiumId}/billing-settings")]
    public async Task<IActionResult> GetSettings([FromRoute] int condominiumId)
    {
        return Ok(await _billingService.GetSettingsAsync(GetUserId(), condominiumId));
    }

    [HttpPut("condominiums/{condominiumId}/billing-settings")]
    public async Task<IActionResult> UpdateSettings(
        [FromRoute] int condominiumId,
        [FromBody] UpdateBillingSettingsDto dto)
    {
        return Ok(await _billingService.UpdateSettingsAsync(GetUserId(), condominiumId, dto));
    }

    [HttpGet("condominiums/{condominiumId}/condominium-fee")]
    public async Task<IActionResult> GetFee([FromRoute] int condominiumId)
    {
        return Ok(await _billingService.GetFeeAsync(GetUserId(), condominiumId));
    }

    [HttpPut("condominiums/{condominiumId}/condominium-fee")]
    public async Task<IActionResult> SaveFee([FromRoute] int condominiumId, [FromBody] SaveCondominiumFeeDto dto)
    {
        return Ok(await _billingService.SaveFeeAsync(GetUserId(), condominiumId, dto));
    }

    [HttpPost("condominiums/{condominiumId}/charges/batch")]
    public async Task<IActionResult> CreateBatch(
        [FromRoute] int condominiumId,
        [FromBody] CreateChargeBatchDto dto)
    {
        return Ok(await _chargeService.CreateBatchAsync(GetUserId(), condominiumId, dto));
    }

    [HttpGet("condominiums/{condominiumId}/recurring-charges")]
    public async Task<IActionResult> GetRecurring([FromRoute] int condominiumId)
    {
        return Ok(await _billingService.GetRecurringAsync(GetUserId(), condominiumId));
    }

    [HttpPost("condominiums/{condominiumId}/recurring-charges")]
    public async Task<IActionResult> CreateRecurring(
        [FromRoute] int condominiumId,
        [FromBody] CreateRecurringChargeDto dto)
    {
        return Ok(await _billingService.CreateRecurringAsync(GetUserId(), condominiumId, dto));
    }

    [HttpPut("recurring-charges/{id}/pause")]
    public async Task<IActionResult> Pause([FromRoute] int id)
    {
        return Ok(await _billingService.PauseRecurringAsync(GetUserId(), id));
    }

    [HttpPut("recurring-charges/{id}/resume")]
    public async Task<IActionResult> Resume([FromRoute] int id)
    {
        return Ok(await _billingService.ResumeRecurringAsync(GetUserId(), id));
    }

    [HttpPut("recurring-charges/{id}/end")]
    public async Task<IActionResult> End([FromRoute] int id)
    {
        return Ok(await _billingService.EndRecurringAsync(GetUserId(), id));
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
