using System.ComponentModel.DataAnnotations;
using backend.Enums;
using backend.Models;

public class Invitation
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    [Required]
    public int PersonId { get; set; }
    public Person Person { get; set; } = null!;

    [Required]
    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;

    [Required]
    [EmailAddress]
    [StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public UserRole Role { get; set; }

    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    public InvitationStatus InvitationStatus { get; set; } = InvitationStatus.Pending;

    [Required]
    public DateTime ExpiresAt { get; set; }

    public DateTime? AcceptedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}