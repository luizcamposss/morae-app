namespace backend.DTOs.MercadoPago;

public class MercadoPagoConnectionStatusDto
{
    public bool IsConnected { get; set; }
    public long? MercadoPagoUserId { get; set; }
    public string PublicKey { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public bool LiveMode { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? ConnectedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}