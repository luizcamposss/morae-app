using System.Security.Claims;
using backend.DTOs.PaymentProof;
using backend.Services.PaymentProofs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class PaymentProofsController : ControllerBase
{
    // Room for a 10 MB receipt plus the note.
    private const long UploadRequestLimitBytes = 11 * 1024 * 1024;

    private readonly IPaymentProofService _paymentProofService;

    public PaymentProofsController(IPaymentProofService paymentProofService)
    {
        _paymentProofService = paymentProofService;
    }

    [HttpGet("api/charges/{chargeId}/pix-info")]
    public async Task<IActionResult> GetPixInfo([FromRoute] int chargeId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        return Ok(await _paymentProofService.GetPixInfoAsync(userId, chargeId));
    }

    [HttpPost("api/charges/{chargeId}/payment-proofs")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(UploadRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadRequestLimitBytes)]
    public async Task<IActionResult> Create(
        [FromRoute] int chargeId,
        [FromForm] CreatePaymentProofDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var proof = await _paymentProofService.CreateAsync(userId, chargeId, dto);

        return CreatedAtAction(nameof(GetByCharge), new { chargeId }, proof);
    }

    [HttpGet("api/charges/{chargeId}/payment-proofs")]
    public async Task<IActionResult> GetByCharge([FromRoute] int chargeId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        return Ok(await _paymentProofService.GetByChargeAsync(userId, chargeId));
    }

    [HttpGet("api/payment-proofs/{id}/file")]
    public async Task<IActionResult> Download([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var download = await _paymentProofService.DownloadAsync(userId, id);

        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpPut("api/payment-proofs/{id}/reject")]
    public async Task<IActionResult> Reject(
        [FromRoute] int id,
        [FromBody] RejectPaymentProofDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        return Ok(await _paymentProofService.RejectAsync(userId, id, dto));
    }
}
