using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using backend.DTOs;
using backend.Data;
using backend.Exceptions;
using backend.DTOs.Auth;
using backend.Models;
using backend.Services.Email;
using backend.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
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
    private readonly IEmailQueue _emailQueue;
    private readonly AppSettings _appSettings;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration,
        AppDbContext context,
        ILogger<AuthService> logger,
        IEmailQueue emailQueue,
        IOptions<AppSettings> appSettings)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _context = context;
        _logger = logger;
        _emailQueue = emailQueue;
        _appSettings = appSettings.Value;
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

        await QueuePasswordChangedEmailAsync(user);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var email = dto.Email?.Trim();

        if (string.IsNullOrEmpty(email))
            throw new BadRequestException("Informe o seu e-mail.");

        // The caller always gets the same answer, so nobody can find out which e-mails have an account.
        var user = await _userManager.FindByEmailAsync(email);

        if (user is null || string.IsNullOrEmpty(user.Email))
            return;

        // Identity's token embeds the security stamp: it stops working once the password changes,
        // so each link works only once. Lifetime: 1 hour (DataProtectionTokenProviderOptions).
        var identityToken = await _userManager.GeneratePasswordResetTokenAsync(user);

        // The link carries one opaque code (user id + token) instead of the e-mail address,
        // so the address does not end up in browser history or server logs.
        var code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes($"{user.Id}:{identityToken}"));
        var resetUrl = _appSettings.BuildFrontendUrl($"reset-password?token={code}");

        var name = await GetPersonNameAsync(user);

        _emailQueue.Enqueue(AccountEmails.PasswordReset(name, resetUrl).ToMessage(user.Email));
    }

    public async Task ResetPasswordAsync(ResetPasswordDto dto)
    {
        const string invalidLink = "Este link é inválido ou expirou. Peça um novo em \"Esqueci minha senha\".";

        if (string.IsNullOrEmpty(dto.NewPassword))
            throw new BadRequestException("Informe a nova senha.");

        if (!TryReadResetCode(dto.Token, out var userId, out var identityToken))
            throw new BadRequestException(invalidLink);

        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new BadRequestException(invalidLink);

        // Also enforces the password rules (length, letter, digit).
        var result = await _userManager.ResetPasswordAsync(user, identityToken, dto.NewPassword);

        if (!result.Succeeded)
        {
            if (result.Errors.Any(error => error.Code == nameof(IdentityErrorDescriber.InvalidToken)))
                throw new BadRequestException(invalidLink);

            throw new BadRequestException(string.Join(" ", result.Errors.Select(error => error.Description)));
        }

        // Whoever knew the old password is signed out everywhere, and a lockout from
        // wrong guesses no longer blocks the owner who just proved access to the e-mail.
        await RevokeAllAsync(user.Id);
        await _userManager.SetLockoutEndDateAsync(user, null);
        await _userManager.ResetAccessFailedCountAsync(user);

        await QueuePasswordChangedEmailAsync(user);
    }

    private static bool TryReadResetCode(string? code, out int userId, out string identityToken)
    {
        userId = 0;
        identityToken = string.Empty;

        if (string.IsNullOrWhiteSpace(code))
            return false;

        try
        {
            var decoded = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(code));
            var separator = decoded.IndexOf(':');

            if (separator <= 0 || !int.TryParse(decoded[..separator], out userId))
                return false;

            identityToken = decoded[(separator + 1)..];
            return identityToken.Length > 0;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private async Task QueuePasswordChangedEmailAsync(ApplicationUser user)
    {
        if (string.IsNullOrEmpty(user.Email))
            return;

        var name = await GetPersonNameAsync(user);

        _emailQueue.Enqueue(AccountEmails.PasswordChanged(name).ToMessage(user.Email));
    }

    private async Task<string> GetPersonNameAsync(ApplicationUser user)
    {
        var name = await _context.Persons
            .Where(person => person.Id == user.PersonId)
            .Select(person => person.Name)
            .FirstOrDefaultAsync();

        // First name only: friendlier greeting.
        return string.IsNullOrWhiteSpace(name) ? "morador(a)" : name.Trim().Split(' ')[0];
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
