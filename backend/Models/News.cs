using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.Models;

public class News
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    [Required]
    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int? BuildingId { get; set; }
    public Building? Building { get; set; }

    [Required]
    [StringLength(100)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public NewsTargetAudience TargetAudience { get; set; }

    public Priority Priority { get; set; } = Priority.Undefined;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}