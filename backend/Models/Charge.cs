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
    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    [Required]
    public decimal Value { get; set; }

    [Required]
    public DateTime DueDate { get; set; }

    [Required]
    [StringLength(255)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public ChargeStatus Status { get; set; } = ChargeStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}