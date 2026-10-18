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

    // Late fee rule of this charge (null = no fine/interest) and the amounts as of today
    // (São Paulo). UpdatedAmount is what the payer pays now; for paid/canceled charges it is Value.
    public decimal? FinePercent { get; set; }
    public decimal? MonthlyInterestPercent { get; set; }
    public int DaysLate { get; set; }
    public decimal FineAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal UpdatedAmount { get; set; }

    public int? RecurringChargeId { get; set; }
    public DateOnly? ReferenceMonth { get; set; }
}
