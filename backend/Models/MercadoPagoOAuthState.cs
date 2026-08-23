using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class MercadoPagoOAuthState
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(120)]
    public string State { get; set; } = string.Empty;

    [Required]
    [StringLength(160)]
    public string CodeVerifier { get; set; } = string.Empty;

    [Required]
    public int UserId { get; set; }

    public ApplicationUser User { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UsedAt { get; set; }
}