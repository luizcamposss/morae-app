namespace backend.Services.MercadoPago;

public interface IMercadoPagoTokenProtector
{
    string Protect(string token);
    string Unprotect(string protectedToken);
}
