using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs.Rental;

public class RentalContractResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int UnitId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public int TenantPersonId { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public decimal MonthlyRent { get; set; }
    public int DueDay { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IncludesWater { get; set; }
    public bool IncludesElectricity { get; set; }
    public bool IncludesGas { get; set; }
    public bool IncludesCondominiumFee { get; set; }
    public decimal? CondominiumFeeAmount { get; set; }
    public RentAdjustmentIndex AdjustmentIndex { get; set; }
    public DateOnly? NextAdjustmentDate { get; set; }
    public RentalContractStatus Status { get; set; }
    public DateOnly? LastBilledMonth { get; set; }
    public string? EndReason { get; set; }
    public List<RentValueChangeDto> ValueChanges { get; set; } = [];
}

public class RentValueChangeDto
{
    public decimal? PreviousValue { get; set; }
    public decimal NewValue { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveRentalContractDto
{
    // Ignored on update (a contract stays on its unit and tenant; end it and start a new one).
    public int UnitId { get; set; }
    public int TenantPersonId { get; set; }

    // Ignored on update: the rent changes through an adjustment (kept in the history).
    [Range(0.01, 1_000_000)]
    public decimal MonthlyRent { get; set; }

    [Range(1, 31)]
    public int DueDay { get; set; } = 10;

    [Required]
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    public bool IncludesWater { get; set; }
    public bool IncludesElectricity { get; set; }
    public bool IncludesGas { get; set; }
    public bool IncludesCondominiumFee { get; set; }

    [Range(0, 1_000_000)]
    public decimal? CondominiumFeeAmount { get; set; }

    [EnumDataType(typeof(RentAdjustmentIndex))]
    public RentAdjustmentIndex AdjustmentIndex { get; set; } = RentAdjustmentIndex.Ipca;

    // Null = 12 months after the start (or none, when the index is None).
    public DateOnly? NextAdjustmentDate { get; set; }
}

public class AdjustRentDto
{
    [Range(0.01, 1_000_000)]
    public decimal NewValue { get; set; }
}

public class EndRentalContractDto
{
    [Required]
    public DateOnly EndDate { get; set; }

    [StringLength(255)]
    public string? Reason { get; set; }
}
