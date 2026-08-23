using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class MercadoPagoAccount
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    public ApplicationUser User { get; set; } = null!;

    public long? MercadoPagoUserId { get; set; }

    [Required]
    [StringLength(200)]
    public string PublicKey { get; set; } = string.Empty;

    [Required]
    public string AccessToken { get; set; } = string.Empty;

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