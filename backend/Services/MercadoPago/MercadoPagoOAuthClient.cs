using System.Net.Http.Json;
using backend.DTOs.MercadoPago;
using backend.Exceptions;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Services.MercadoPago;

public class MercadoPagoOAuthClient : IMercadoPagoOAuthClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly MercadoPagoSettings _settings;
    private readonly ILogger<MercadoPagoOAuthClient> _logger;

    public MercadoPagoOAuthClient(
        IHttpClientFactory httpClientFactory,
        IOptions<MercadoPagoSettings> options,
        ILogger<MercadoPagoOAuthClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = options.Value;
        _logger = logger;
    }

    public async Task<MercadoPagoOAuthCredentialDto> ExchangeCodeForTokenAsync(
        string code,
        string codeVerifier)
    {
        var httpClient = _httpClientFactory.CreateClient();
        var request = new
        {
            client_id = _settings.ClientId,
            client_secret = _settings.ClientSecret,
            grant_type = "authorization_code",
            code,
            redirect_uri = _settings.OAuthRedirectUri,
            code_verifier = codeVerifier,
            test_token = IsSandboxEnvironment()
        };

        using var response = await httpClient.PostAsJsonAsync(
            "https://api.mercadopago.com/oauth/token",
            request);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "Mercado Pago OAuth code exchange failed with {StatusCode}: {Error}",
                (int)response.StatusCode,
                error);
            throw new BadRequestException("Não foi possível conectar a conta Mercado Pago. Tente novamente.");
        }

        return await response.Content.ReadFromJsonAsync<MercadoPagoOAuthCredentialDto>()
            ?? throw new BadRequestException("O Mercado Pago não retornou os dados da conexão. Tente novamente.");
    }

    public async Task<MercadoPagoOAuthCredentialDto> RefreshTokenAsync(string refreshToken)
    {
        var httpClient = _httpClientFactory.CreateClient();
        var request = new
        {
            client_id = _settings.ClientId,
            client_secret = _settings.ClientSecret,
            grant_type = "refresh_token",
            refresh_token = refreshToken,
            test_token = IsSandboxEnvironment()
        };

        using var response = await httpClient.PostAsJsonAsync(
            "https://api.mercadopago.com/oauth/token",
            request);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "Mercado Pago OAuth token refresh failed with {StatusCode}: {Error}",
                (int)response.StatusCode,
                error);
            throw new BadRequestException("A conexão com o Mercado Pago expirou. Conecte a conta novamente.");
        }

        return await response.Content.ReadFromJsonAsync<MercadoPagoOAuthCredentialDto>()
            ?? throw new BadRequestException("A conexão com o Mercado Pago expirou. Conecte a conta novamente.");
    }

    private bool IsSandboxEnvironment()
    {
        return string.Equals(_settings.Environment, "Sandbox", StringComparison.OrdinalIgnoreCase);
    }
}
