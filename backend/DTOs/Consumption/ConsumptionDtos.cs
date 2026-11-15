using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs.Consumption;

// "Água, luz e gás" of a month: one row per unit, an amount in R$ per utility the condominium bills.
public class UtilityMonthDto
{
    public string Month { get; set; } = string.Empty;
    // 3 Water, 4 Electricity, 5 Gas — the columns to show.
    public List<ChargeCategory> Utilities { get; set; } = [];
    public List<UtilityRowDto> Rows { get; set; } = [];
}

public class UtilityRowDto
{
    public int UnitId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    // Who pays the unit's condominium bills this month (tenant or owners).
    public string? PayerName { get; set; }
    public List<UtilityAmountDto> Amounts { get; set; } = [];
}

public class UtilityAmountDto
{
    public ChargeCategory Category { get; set; }
    public decimal Amount { get; set; }
    // Its bill was already sent: it can't change anymore.
    public bool IsLocked { get; set; }
}

public class SaveUtilitiesDto
{
    [Required]
    public string Month { get; set; } = string.Empty;
    [Required]
    public List<SaveUtilityAmountDto> Amounts { get; set; } = [];
}

public class SaveUtilityAmountDto
{
    public int UnitId { get; set; }
    public ChargeCategory Category { get; set; }
    // Null or 0 = no charge for this utility this month (removes a draft one).
    [Range(0, 1_000_000)]
    public decimal? Amount { get; set; }
}

public class SaveUtilitiesResultDto
{
    public int Saved { get; set; }
    public decimal Total { get; set; }
}

public class UtilitySettingsDto
{
    public List<ChargeCategory> Utilities { get; set; } = [];
}

// Resident: what one unit paid for one utility, month by month (R$).
public class ConsumptionHistoryDto
{
    public int UnitId { get; set; }
    public string UnitLabel { get; set; } = string.Empty;
    public ChargeCategory Category { get; set; }
    public List<ConsumptionPointDto> Months { get; set; } = [];
}

public class ConsumptionPointDto
{
    public string Month { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
