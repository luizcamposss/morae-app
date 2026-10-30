using backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Notification
{
    [Key]
    public int Id { get; set; }

    public int UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    public NotificationType Type { get; set; } = NotificationType.System;

    [Required]
    [MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? LinkUrl { get; set; }

    public int? CondominiumId { get; set; }
    public Condominium? Condominium { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}
