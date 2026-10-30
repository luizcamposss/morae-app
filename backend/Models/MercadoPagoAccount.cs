using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class MercadoPagoAccount
{
    [Key]
    public int Id { get; set; }

    // Null for the platform account (receives platform charges, connected by the Master).
    // Set for a condominium account (receives that condominium's charges, connected by an Admin).
    public int? CondominiumId { get; set; }

    public Condominium? Condominium { get; set; }

    // User who connected the account.
    [Required]
    public int UserId { get; set; }

    public ApplicationUser User { get; set; } = null!;

    public long? MercadoPagoUserId { get; set; }

    [Required]
    [StringLength(200)]
    public string PublicKey { get; set; } = string.Empty;

    // Encrypted with ASP.NET Data Protection (see MercadoPagoTokenProtector).
    [Required]
    public string AccessToken { get; set; } = string.Empty;

    // Encrypted with ASP.NET Data Protection (see MercadoPagoTokenProtector).
    [Required]
    public string RefreshToken { get; set; } = string.Empty;

    [StringLength(50)]
    public string TokenType { get; set; } = string.Empty;

    public string Scope { get; set; } = string.Empty;

    public bool LiveMode { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
