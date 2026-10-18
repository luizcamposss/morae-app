using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs.Charge;

public class CreateRecurringChargeDto
{
    // Null = every building of the condominium.
    public int? BuildingId { get; set; }

    [Required]
    [Range(0.01, 99999999.99)]
    public decimal Value { get; set; }

    // Null = the condominium's billing due day.
    [Range(1, 31)]
    public int? DueDay { get; set; }

    [Required]
    [StringLength(255)]
    public string Description { get; set; } = string.Empty;

    public List<ChargeUnitValueDto> UnitValues { get; set; } = [];
}

public class RecurringChargeResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int? BuildingId { get; set; }
    public string? BuildingName { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public int? DueDay { get; set; }
    public int EffectiveDueDay { get; set; }
    public RecurringChargeStatus Status { get; set; }
    public List<RecurringChargeUnitValueDto> UnitValues { get; set; } = [];
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    // Only filled on create/resume: the charges generated right away (when inside the 10-day window).
    public ChargeBatchResultDto? Generation { get; set; }
}

public class RecurringChargeUnitValueDto
{
    public int UnitId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public decimal Value { get; set; }
}
