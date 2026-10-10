using System.Security.Claims;
using backend.DTOs;
using backend.DTOs.Auth;
using backend.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    // The refresh token lives in an HttpOnly cookie: page scripts cannot read it, so an injected
    // script cannot steal the long-lived session. It is only sent to /api/auth.
    private const string RefreshTokenCookie = "morae_refresh";
    private const string RefreshTokenCookiePath = "/api/auth";

    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var (result, refreshToken) = await _authService.LoginAsync(dto);

        if (!result.Success || refreshToken is null)
        {
            return BadRequest(result);
        }

        SetRefreshTokenCookie(refreshToken);

        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookie];

        var result = string.IsNullOrEmpty(refreshToken)
            ? null
            : await _authService.RefreshAsync(refreshToken);

        if (result is null)
        {
            DeleteRefreshTokenCookie();
            return Unauthorized(new { message = "Sua sessão expirou. Entre novamente." });
        }

        if (result.NewRefreshToken is not null)
            SetRefreshTokenCookie(result.NewRefreshToken);

        return Ok(new { token = result.AccessToken });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookie];

        if (!string.IsNullOrEmpty(refreshToken))
            await _authService.RevokeAsync(refreshToken);

        DeleteRefreshTokenCookie();

        return NoContent();
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        await _authService.ChangePasswordAsync(userId, dto, Request.Cookies[RefreshTokenCookie]);

        return NoContent();
    }

    private void SetRefreshTokenCookie(string refreshToken)
    {
        Response.Cookies.Append(RefreshTokenCookie, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = RefreshTokenCookiePath,
            Expires = DateTimeOffset.UtcNow.AddDays(_authService.GetRefreshTokenDays())
        });
    }

    private void DeleteRefreshTokenCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookie, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = RefreshTokenCookiePath
        });
    }
}
