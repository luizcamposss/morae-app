using System.Security.Claims;
using backend.DTOs.MercadoPago;
using backend.Services.MercadoPago;
using backend.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using backend.Constants;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MercadoPagoController : ControllerBase
{
    private readonly IMercadoPagoService _mercadoPagoService;
    private readonly AppSettings _appSettings;

    public MercadoPagoController(
        IMercadoPagoService mercadoPagoService,
        IOptions<AppSettings> appOptions)
    {
        _mercadoPagoService = mercadoPagoService;
        _appSettings = appOptions.Value;
    }

    [Authorize]
    [HttpPost("oauth/connect")]
    public async Task<IActionResult> StartOAuth([FromBody] MercadoPagoOAuthStartRequestDto? dto)
    {
        var result = await _mercadoPagoService.StartOAuthAsync(GetUserId(), dto?.CondominiumId);

        return Ok(result);
    }

    // Mercado Pago redirects the browser here. The callback carries no session, so it only
    // forwards the result to the frontend, which completes the connection as the logged-in user.
    [AllowAnonymous]
    [HttpGet("oauth/callback")]
    public IActionResult OAuthCallback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error)
    {
        var query = new Dictionary<string, string?>();

        if (!string.IsNullOrWhiteSpace(code) && !string.IsNullOrWhiteSpace(state))
        {
            query["code"] = code;
            query["state"] = state;
        }
        else
        {
            query["error"] = string.IsNullOrWhiteSpace(error) ? "invalid_callback" : error;
        }

        return Redirect(QueryHelpers.AddQueryString(
            _appSettings.BuildFrontendUrl("mercadopago/return"),
            query));
    }

    [Authorize]
    [HttpPost("oauth/complete")]
    public async Task<IActionResult> CompleteOAuth([FromBody] MercadoPagoOAuthCompleteDto dto)
    {
        var result = await _mercadoPagoService.CompleteOAuthAsync(GetUserId(), dto);

        return Ok(result);
    }

    [Authorize]
    [HttpGet("oauth/status")]
    public async Task<IActionResult> GetOAuthStatus([FromQuery] int? condominiumId)
    {
        var result = await _mercadoPagoService.GetConnectionStatusAsync(GetUserId(), condominiumId);

        return Ok(result);
    }

    [Authorize]
    [HttpDelete("oauth/connection")]
    public async Task<IActionResult> Disconnect([FromQuery] int? condominiumId)
    {
        await _mercadoPagoService.DisconnectAsync(GetUserId(), condominiumId);

        return NoContent();
    }

    [Authorize]
    [HttpGet("/api/charges/{chargeId}/mercadopago/payment-setup")]
    public async Task<IActionResult> GetPaymentSetup([FromRoute] int chargeId)
    {
        var result = await _mercadoPagoService.GetPaymentSetupAsync(GetUserId(), chargeId);

        return Ok(result);
    }

    [Authorize]
    [HttpPost("/api/charges/{chargeId}/mercadopago/payments")]
    public async Task<IActionResult> CreatePayment(
        [FromRoute] int chargeId,
        [FromBody] MercadoPagoCreatePaymentDto dto)
    {
        var result = await _mercadoPagoService.CreatePaymentAsync(GetUserId(), chargeId, dto);

        return Ok(result);
    }

    [Authorize]
    [HttpGet("/api/charges/{chargeId}/mercadopago/payment-status")]
    public async Task<IActionResult> GetPaymentStatus([FromRoute] int chargeId)
    {
        var result = await _mercadoPagoService.GetPaymentStatusAsync(GetUserId(), chargeId);

        return Ok(result);
    }

    [Authorize]
    [HttpPost("/api/charges/{chargeId}/mercadopago/refund")]
    public async Task<IActionResult> RefundPayment([FromRoute] int chargeId)
    {
        await _mercadoPagoService.RefundPaymentAsync(GetUserId(), chargeId);

        return NoContent();
    }

    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Webhook)]
    [HttpPost("webhooks")]
    public async Task<IActionResult> ReceiveWebhook(
        [FromBody] MercadoPagoWebhookDto notification,
        [FromQuery(Name = "type")] string? type,
        [FromQuery(Name = "data.id")] string? dataId)
    {
        await _mercadoPagoService.HandleWebhookAsync(
            notification,
            type,
            dataId,
            Request.Headers["x-signature"].FirstOrDefault(),
            Request.Headers["x-request-id"].FirstOrDefault());

        return Ok();
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
