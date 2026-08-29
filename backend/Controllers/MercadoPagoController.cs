using System.Security.Claims;
using backend.DTOs.MercadoPago;
using backend.Services.MercadoPago;
using backend.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MercadoPagoController : ControllerBase
{
    private readonly IMercadoPagoService _mercadoPagoService;
    private readonly MercadoPagoSettings _settings;
    private readonly ILogger<MercadoPagoController> _logger;

    public MercadoPagoController(
        IMercadoPagoService mercadoPagoService,
        IOptions<MercadoPagoSettings> options,
        ILogger<MercadoPagoController> logger)
    {
        _mercadoPagoService = mercadoPagoService;
        _settings = options.Value;
        _logger = logger;
    }

    [Authorize]
    [HttpPost("oauth/connect")]
    public async Task<IActionResult> StartOAuth()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _mercadoPagoService.StartOAuthAsync(userId);

        return Ok(result);
    }

    [HttpGet("oauth/callback")]
    public async Task<IActionResult> OAuthCallback(
        [FromQuery] string code,
        [FromQuery] string state)
    {
        try
        {
            await _mercadoPagoService.CompleteOAuthAsync(code, state);

            return Redirect(GetOAuthSuccessRedirectUrl());
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Mercado Pago OAuth callback failed.");
            return Redirect(GetOAuthFailureRedirectUrl());
        }
    }

    [Authorize]
    [HttpGet("oauth/status")]
    public async Task<IActionResult> GetOAuthStatus()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _mercadoPagoService.GetConnectionStatusAsync(userId);

        return Ok(result);
    }

    [Authorize]
    [HttpPost("/api/charges/{chargeId}/mercadopago/checkout")]
    public async Task<IActionResult> CreateCheckout([FromRoute] int chargeId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _mercadoPagoService.CreateCheckoutAsync(userId, chargeId);

        return Ok(result);
    }

    [AllowAnonymous]
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

    private string GetOAuthSuccessRedirectUrl()
    {
        return string.IsNullOrWhiteSpace(_settings.OAuthSuccessRedirectUrl)
            ? "http://localhost:5173/admin/settings"
            : _settings.OAuthSuccessRedirectUrl;
    }

    private string GetOAuthFailureRedirectUrl()
    {
        return string.IsNullOrWhiteSpace(_settings.OAuthFailureRedirectUrl)
            ? "http://localhost:5173/admin/settings"
            : _settings.OAuthFailureRedirectUrl;
    }
}
