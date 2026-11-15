namespace backend.DTOs.MercadoPago;

public class MercadoPagoOAuthStartRequestDto
{
    // Null connects the platform account (Master); set connects that condominium's account (Admin).
    public int? CondominiumId { get; set; }

    // True connects the logged-in unit owner's own account (rent of the units they rent out).
    public bool AsOwner { get; set; }
}
