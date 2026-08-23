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

    public MercadoPagoOAuthClient(
        IHttpClientFactory httpClientFactory,
        IOptions<MercadoPagoSettings> options)
    {
        _httpClientFactory = httpClientFactory;
        _settings = options.Value;
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
            throw new BadRequestException($"Mercado Pago OAuth error: {error}");
        }

        return await response.Content.ReadFromJsonAsync<MercadoPagoOAuthCredentialDto>()
            ?? throw new BadRequestException("Mercado Pago OAuth returned an empty response.");
    }

    private bool IsSandboxEnvironment()
    {
        return string.Equals(_settings.Environment, "Sandbox", StringComparison.OrdinalIgnoreCase);
    }
}
