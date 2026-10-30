using System.ComponentModel.DataAnnotations;

namespace backend.Models;

// Long-lived session key used only to get new access tokens. Only its SHA-256 hash is stored.
public class RefreshToken
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    [Required]
    [StringLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }

    // Set when the token was rotated: using a replaced token again means it leaked.
    [StringLength(64)]
    public string? ReplacedByTokenHash { get; set; }
}
