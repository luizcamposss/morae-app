using backend.DTOs.MercadoPago;

namespace backend.Services.MercadoPago;

public interface IMercadoPagoOAuthClient
{
    Task<MercadoPagoOAuthCredentialDto> ExchangeCodeForTokenAsync(
        string code,
        string codeVerifier);
}