using Microsoft.AspNetCore.DataProtection;

namespace backend.Services.MercadoPago;

public class MercadoPagoTokenProtector : IMercadoPagoTokenProtector
{
    private readonly IDataProtector _protector;

    public MercadoPagoTokenProtector(IDataProtectionProvider dataProtectionProvider)
    {
        _protector = dataProtectionProvider.CreateProtector("Morae.MercadoPago.OAuthTokens.v1");
    }

    public string Protect(string token)
    {
        return string.IsNullOrEmpty(token) ? string.Empty : _protector.Protect(token);
    }

    public string Unprotect(string protectedToken)
    {
        return string.IsNullOrEmpty(protectedToken) ? string.Empty : _protector.Unprotect(protectedToken);
    }
}
