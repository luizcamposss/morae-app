using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Charge;

public class CreateChargeDto
{
    [Required]
    public ChargeScope Scope { get; set; }

    [Required]
    public int CondominiumId { get; set; }

    public int? TargetUserId { get; set; }

    public int? UnitId { get; set; }

    [Required]
    [Range(0.01, 99999999.99)]
    public decimal Value { get; set; }

    [Required]
    public DateTime DueDate { get; set; }

    [Required]
    [StringLength(255)]
    public string Description { get; set; } = string.Empty;
}