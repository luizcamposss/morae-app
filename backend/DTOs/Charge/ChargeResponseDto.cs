using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Charge;

public class ChargeResponseDto
{
    public int Id { get; set; }
    public ChargeScope Scope { get; set; }
    public int CreatedByUserId { get; set; }
    public int? TargetUserId { get; set; }
    public int CondominiumId { get; set; }
    public string CondominiumName { get; set; } = string.Empty;
    public int? UnitId { get; set; }
    public string? UnitNumber { get; set; }
    public string? BuildingName { get; set; }
    public decimal Value { get; set; }
    public DateTime DueDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? CancelReason { get; set; }
    public ChargeStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CanceledAt { get; set; }
}
