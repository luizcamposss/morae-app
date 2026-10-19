using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Delinquency;

public class DelinquencyResponseDto
{
    public int ChargeId { get; set; }
    public ChargeScope Scope { get; set; }
    public int CondominiumId { get; set; }
    public int? TargetUserId { get; set; }
    public int? UnitId { get; set; }
    // Value is the original amount. FineAmount and InterestAmount are the late fees as of today
    // (São Paulo, rule snapshotted on the charge); UpdatedAmount = Value + FineAmount + InterestAmount
    // is what is owed now, and delinquency totals should sum it.
    public decimal Value { get; set; }
    public decimal FineAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal UpdatedAmount { get; set; }
    public DateTime DueDate { get; set; }
    public int DaysLate { get; set; }
    public string Description { get; set; } = string.Empty;
    public ChargeStatus Status { get; set; }
}