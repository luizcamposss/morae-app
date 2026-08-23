using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
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

    public MercadoPagoController(
        IMercadoPagoService mercadoPagoService,
        IOptions<MercadoPagoSettings> options)
    {
        _mercadoPagoService = mercadoPagoService;
        _settings = options.Value;
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
        catch
        {
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