using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.DTOs.Payment;
using backend.Services.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/charges/{chargeId}/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost("manual")]
    public async Task<IActionResult> CreateManual(
        [FromRoute] int chargeId,
        [FromBody] CreateManualPaymentDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var payment = await _paymentService.CreateManualAsync(userId, chargeId, dto);

        return CreatedAtAction(
            nameof(GetByCharge),
            new { chargeId },
            payment);
    }

    [HttpGet]
    public async Task<IActionResult> GetByCharge([FromRoute] int chargeId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var payments = await _paymentService.GetByChargeAsync(userId, chargeId);

        return Ok(payments);
    }
}