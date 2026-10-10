using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.Models;

public class Charge
{
    [Key]
    public int Id { get; set; }
    [Required]
    public ChargeScope Scope { get; set; }

    [Required]
    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;

    public int? TargetUserId { get; set; }
    public ApplicationUser? TargetUser { get; set; }

    [Required]
    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;
    public int? UnitId { get; set; }
    public Unit? Unit { get; set; }

    [Required]
    public decimal Value { get; set; }

    [Required]
    public DateTime DueDate { get; set; }

    [Required]
    [StringLength(255)]
    public string Description { get; set; } = string.Empty;

    public string? CancelReason { get; set; }
    
    [Required]
    public ChargeStatus Status { get; set; } = ChargeStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CanceledAt { get; set; }

    // Set by the daily reminder job so each reminder goes out only once.
    public DateTime? DueSoonReminderSentAt { get; set; }
    public DateTime? OverdueReminderSentAt { get; set; }
}