namespace backend.Services.MercadoPago;

public interface IPkceService
{
    string CreateState();
    string CreateCodeVerifier();
    string CreateCodeChallenge(string codeVerifier);
}