namespace backend.DTOs.MercadoPago;

public class MercadoPagoOAuthStartRequestDto
{
    // Null connects the platform account (Master); set connects that condominium's account (Admin).
    public int? CondominiumId { get; set; }
}
