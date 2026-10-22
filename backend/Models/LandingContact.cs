using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// A lead from the public landing page ("Ver o Moraê funcionando"). Not tied to any condominium.
public class LandingContact
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(120)]
    public string Name { get; set; } = string.Empty;

    // Digits only, with the country code (55 is added to Brazilian numbers typed without it).
    [Required]
    [StringLength(13)]
    public string WhatsApp { get; set; } = string.Empty;

    [Required]
    public int UnitCount { get; set; }

    [Required]
    public LandingContactProfileType Profile { get; set; }

    // Hero pain id picked on the landing (see LandingContactPains), or null when not sent.
    [StringLength(20)]
    public string? Pain { get; set; }

    [Required]
    public LandingContactStatus Status { get; set; } = LandingContactStatus.New;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
