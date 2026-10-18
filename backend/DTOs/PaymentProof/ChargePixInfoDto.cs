using backend.Enums;

namespace backend.DTOs.PaymentProof;

// What the payer needs to transfer by Pix when the condominium has no Mercado Pago.
public class ChargePixInfoDto
{
    public int ChargeId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string CondominiumName { get; set; } = string.Empty;
    public string PixKey { get; set; } = string.Empty;
    public PixKeyType PixKeyType { get; set; }
    public string? HolderName { get; set; }
    // Amount due today (São Paulo), with fine and interest when late.
    public decimal Amount { get; set; }
}
