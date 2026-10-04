using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using backend.DTOs;
using backend.Data;
using backend.Exceptions;
using backend.DTOs.Auth;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services.Auth;

public class AuthService : IAuthService
{
    // A second refresh with a just-rotated token within this window comes from parallel requests
    // (another tab, simultaneous calls), not from theft.
    private static readonly TimeSpan RotationGracePeriod = TimeSpan.FromSeconds(30);

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;
    private readonly AppDbContext _context;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration,
        AppDbContext context,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _context = context;
        _logger = logger;
    }

    public async Task<(AuthResponseDto Response, string? RefreshToken)> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);

        if (user is null)
        {
            return (new AuthResponseDto
            {
                Success = false,
                Message = "E-mail ou senha inválidos."
            }, null);
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            return (new AuthResponseDto
            {
                Success = false,
                Message = "Acesso bloqueado temporariamente por excesso de tentativas. Tente novamente em 15 minutos."
            }, null);
        }

        if (!result.Succeeded)
        {
            return (new AuthResponseDto
            {
                Success = false,
                Message = "E-mail ou senha inválidos."
            }, null);
        }

        var token = await GenerateJwtToken(user);
        var refreshToken = await IssueRefreshTokenAsync(user.Id);

        return (new AuthResponseDto
        {
            Success = true,
            Message = "Login realizado com sucesso.",
            Token = token
        }, refreshToken);
    }

    public async Task<RefreshResultDto?> RefreshAsync(string refreshToken)
    {
        var tokenHash = HashToken(refreshToken);

        var storedToken = await _context.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token => token.TokenHash == tokenHash);

        if (storedToken is null || storedToken.ExpiresAt <= DateTime.UtcNow)
            return null;

        if (storedToken.RevokedAt.HasValue)
        {
            var isParallelRefresh =
                storedToken.ReplacedByTokenHash is not null &&
                storedToken.RevokedAt.Value > DateTime.UtcNow - RotationGracePeriod;

            if (isParallelRefresh)
            {
                // The browser already holds the new refresh token; just hand out an access token.
                return new RefreshResultDto { AccessToken = await GenerateJwtToken(storedToken.User) };
            }

            // A rotated token was used again: it leaked. End every session of this user.
            if (storedToken.ReplacedByTokenHash is not null)
            {
                _logger.LogWarning("Reuse of a rotated refresh token for user {UserId}; revoking all sessions.", storedToken.UserId);
                await RevokeAllAsync(storedToken.UserId);
            }

            return null;
        }

        var newRefreshToken = CreateRandomToken();
        var newTokenHash = HashToken(newRefreshToken);

        storedToken.RevokedAt = DateTime.UtcNow;
        storedToken.ReplacedByTokenHash = newTokenHash;

        _context.RefreshTokens.Add(new RefreshToken
        {
            UserId = storedToken.UserId,
            TokenHash = newTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(GetRefreshTokenDays()),
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new RefreshResultDto
        {
            AccessToken = await GenerateJwtToken(storedToken.User),
            NewRefreshToken = newRefreshToken
        };
    }

    public async Task RevokeAsync(string refreshToken)
    {
        var tokenHash = HashToken(refreshToken);

        await _context.RefreshTokens
            .Where(token => token.TokenHash == tokenHash && token.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(token => token.RevokedAt, DateTime.UtcNow));
    }

    public async Task RevokeAllAsync(int userId)
    {
        await _context.RefreshTokens
            .Where(token => token.UserId == userId && token.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(token => token.RevokedAt, DateTime.UtcNow));
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto, string? currentRefreshToken)
    {
        if (string.IsNullOrEmpty(dto.CurrentPassword) || string.IsNullOrEmpty(dto.NewPassword))
            throw new BadRequestException("Informe a senha atual e a nova senha.");

        if (dto.CurrentPassword == dto.NewPassword)
            throw new BadRequestException("A nova senha precisa ser diferente da atual.");

        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("Usuário não encontrado.");

        // Also enforces the password rules (length, letter, digit).
        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);

        if (!result.Succeeded)
        {
            var message = result.Errors.Any(error => error.Code == nameof(IdentityErrorDescriber.PasswordMismatch))
                ? "A senha atual está incorreta."
                : string.Join(" ", result.Errors.Select(error => error.Description));

            throw new BadRequestException(message);
        }

        // Someone who changes the password may suspect the account was used elsewhere:
        // end every other session and keep only this device signed in.
        var keepHash = string.IsNullOrEmpty(currentRefreshToken) ? null : HashToken(currentRefreshToken);

        await _context.RefreshTokens
            .Where(token => token.UserId == userId && token.RevokedAt == null && token.TokenHash != keepHash)
            .ExecuteUpdateAsync(setters => setters.SetProperty(token => token.RevokedAt, DateTime.UtcNow));
    }

    private async Task<string> IssueRefreshTokenAsync(int userId)
    {
        // Housekeeping: drop this user's tokens that can no longer be used.
        await _context.RefreshTokens
            .Where(token => token.UserId == userId && token.ExpiresAt < DateTime.UtcNow.AddDays(-1))
            .ExecuteDeleteAsync();

        var refreshToken = CreateRandomToken();

        _context.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = HashToken(refreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(GetRefreshTokenDays()),
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return refreshToken;
    }

    public int GetRefreshTokenDays()
    {
        return int.TryParse(_configuration["Jwt:RefreshTokenDays"], out var days) && days > 0 ? days : 7;
    }

    private static string CreateRandomToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    private static string HashToken(string token)
    {
        return Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
    }

    public async Task<string> GenerateJwtToken(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.Name, user.UserName ?? string.Empty)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]!)
        );

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        // Short-lived: the frontend renews it with the refresh token.
        var expiresInMinutes = int.TryParse(_configuration["Jwt:AccessTokenMinutes"], out var minutes) && minutes > 0
            ? minutes
            : 15;

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresInMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
