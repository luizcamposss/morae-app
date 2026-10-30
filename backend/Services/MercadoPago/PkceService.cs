using System.Security.Cryptography;
using System.Text;

namespace backend.Services.MercadoPago;

public class PkceService : IPkceService
{
    public string CreateState()
    {
        return ToBase64Url(RandomNumberGenerator.GetBytes(32));
    }

    public string CreateCodeVerifier()
    {
        return ToBase64Url(RandomNumberGenerator.GetBytes(64));
    }

    public string CreateCodeChallenge(string codeVerifier)
    {
        var bytes = SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier));

        return ToBase64Url(bytes);
    }

    private static string ToBase64Url(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", string.Empty);
    }
}