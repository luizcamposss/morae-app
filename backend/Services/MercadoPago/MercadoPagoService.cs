using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.MercadoPago;
using backend.Exceptions;
using backend.Models;
using backend.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services.MercadoPago;

public class MercadoPagoService : IMercadoPagoService
{
    private readonly AppDbContext _context;
    private readonly MercadoPagoSettings _settings;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPkceService _pkceService;
    private readonly IMercadoPagoOAuthClient _oauthClient;
    private readonly IMapper _mapper;

    public MercadoPagoService(
        AppDbContext context,
        IOptions<MercadoPagoSettings> options,
        UserManager<ApplicationUser> userManager,
        IPkceService pkceService,
        IMercadoPagoOAuthClient oauthClient,
        IMapper mapper)
    {
        _context = context;
        _settings = options.Value;
        _userManager = userManager;
        _pkceService = pkceService;
        _oauthClient = oauthClient;
        _mapper = mapper;
    }

    public async Task<MercadoPagoOAuthStartResponseDto> StartOAuthAsync(int userId)
    {
        EnsureOAuthConfigured();
        await EnsureCanConnectOAuthAsync(userId);

        var state = _pkceService.CreateState();
        var codeVerifier = _pkceService.CreateCodeVerifier();
        var expiresAt = DateTime.UtcNow.AddMinutes(10);

        _context.MercadoPagoOAuthStates.Add(new MercadoPagoOAuthState
        {
            State = state,
            CodeVerifier = codeVerifier,
            UserId = userId,
            ExpiresAt = expiresAt
        });

        await _context.SaveChangesAsync();

        return new MercadoPagoOAuthStartResponseDto
        {
            AuthorizationUrl = BuildAuthorizationUrl(
                state,
                _pkceService.CreateCodeChallenge(codeVerifier)),
            State = state,
            ExpiresAt = expiresAt
        };
    }

    public async Task<MercadoPagoConnectionStatusDto> CompleteOAuthAsync(string code, string state)
    {
        EnsureOAuthConfigured();

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            throw new BadRequestException("OAuth code and state are required.");

        var oauthState = await _context.MercadoPagoOAuthStates
            .FirstOrDefaultAsync(item => item.State == state);

        if (oauthState is null || oauthState.UsedAt is not null || oauthState.ExpiresAt < DateTime.UtcNow)
            throw new BadRequestException("Invalid or expired Mercado Pago OAuth state.");

        var credential = await _oauthClient.ExchangeCodeForTokenAsync(
            code,
            oauthState.CodeVerifier);

        var account = await UpsertMercadoPagoAccountAsync(oauthState.UserId, credential);
        oauthState.UsedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return _mapper.Map<MercadoPagoConnectionStatusDto>(account);
    }

    public async Task<MercadoPagoConnectionStatusDto> GetConnectionStatusAsync(int userId)
    {
        await EnsureCanConnectOAuthAsync(userId);

        var account = await _context.MercadoPagoAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId);

        return account is null
            ? new MercadoPagoConnectionStatusDto()
            : _mapper.Map<MercadoPagoConnectionStatusDto>(account);
    }

    private async Task<MercadoPagoAccount> UpsertMercadoPagoAccountAsync(
        int userId,
        MercadoPagoOAuthCredentialDto credential)
    {
        var account = await _context.MercadoPagoAccounts
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (account is null)
        {
            account = new MercadoPagoAccount
            {
                UserId = userId,
                ConnectedAt = DateTime.UtcNow
            };

            _context.MercadoPagoAccounts.Add(account);
        }

        ApplyCredential(account, credential);

        return account;
    }

    private static void ApplyCredential(
        MercadoPagoAccount account,
        MercadoPagoOAuthCredentialDto credential)
    {
        account.MercadoPagoUserId = credential.UserId;
        account.PublicKey = credential.PublicKey ?? string.Empty;
        account.AccessToken = credential.AccessToken ?? string.Empty;
        account.RefreshToken = credential.RefreshToken ?? account.RefreshToken;
        account.TokenType = credential.TokenType ?? string.Empty;
        account.Scope = credential.Scope ?? string.Empty;
        account.LiveMode = credential.LiveMode;
        account.ExpiresAt = DateTime.UtcNow.AddSeconds(Math.Max(credential.ExpiresIn - 60, 0));
        account.UpdatedAt = DateTime.UtcNow;
    }

    private async Task EnsureCanConnectOAuthAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        var isMaster = await _userManager.IsInRoleAsync(user, AppRoles.Master);
        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);

        if (!isMaster && !isAdmin)
            throw new ForbiddenException("Only Master and Admin can connect Mercado Pago.");
    }

    private void EnsureOAuthConfigured()
    {
        if (string.IsNullOrWhiteSpace(_settings.ClientId))
            throw new BadRequestException("Mercado Pago Client ID is not configured.");

        if (string.IsNullOrWhiteSpace(_settings.ClientSecret))
            throw new BadRequestException("Mercado Pago Client Secret is not configured.");

        if (string.IsNullOrWhiteSpace(_settings.OAuthRedirectUri))
            throw new BadRequestException("Mercado Pago OAuth Redirect URI is not configured.");
    }

    private string BuildAuthorizationUrl(string state, string codeChallenge)
    {
        return "https://auth.mercadopago.com/authorization" +
               $"?client_id={Uri.EscapeDataString(_settings.ClientId)}" +
               "&response_type=code" +
               "&platform_id=mp" +
               $"&state={Uri.EscapeDataString(state)}" +
               $"&redirect_uri={Uri.EscapeDataString(_settings.OAuthRedirectUri)}" +
               $"&code_challenge={Uri.EscapeDataString(codeChallenge)}" +
               "&code_challenge_method=S256";
    }
}
