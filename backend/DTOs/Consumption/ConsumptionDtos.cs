using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs.Consumption;

public class UtilityRateDto
{
    // 3 Water, 4 Electricity, 5 Gas.
    public ChargeCategory Category { get; set; }
    public bool Enabled { get; set; }
    [Range(0, 100_000)]
    public decimal PricePerUnit { get; set; }
    [Range(0, 100_000)]
    public decimal MinimumCharge { get; set; }
}

public class SaveUtilityRatesDto
{
    [Required]
    public List<UtilityRateDto> Rates { get; set; } = [];
}

// One row of "Leituras do mês".
public class ReadingRowDto
{
    public int UnitId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    // Who gets the item: the tenant when the rental contract includes this utility.
    public int? PayerPersonId { get; set; }
    public string? PayerName { get; set; }
    // Last reading before this month (null = first reading: type the starting value).
    public decimal? PreviousReading { get; set; }
    public decimal? CurrentReading { get; set; }
    public decimal? Consumption { get; set; }
    public decimal? Amount { get; set; }
    // Average of up to 3 previous months, to flag unusual consumption.
    public decimal? AverageConsumption { get; set; }
    // The item's bill was already sent: the reading can't be corrected anymore.
    public bool IsLocked { get; set; }
}

public class ReadingMonthDto
{
    public string Month { get; set; } = string.Empty;
    public ChargeCategory Category { get; set; }
    public UtilityRateDto? Rate { get; set; }
    public List<ReadingRowDto> Rows { get; set; } = [];
}

public class SaveReadingDto
{
    public int UnitId { get; set; }
    [Range(0, 999_999_999)]
    public decimal CurrentReading { get; set; }
    // Only for a unit's first reading (no previous one stored).
    [Range(0, 999_999_999)]
    public decimal? PreviousReading { get; set; }
}

public class SaveReadingsDto
{
    [Required]
    public string Month { get; set; } = string.Empty;
    public ChargeCategory Category { get; set; }
    [Required]
    public List<SaveReadingDto> Readings { get; set; } = [];
}

public class SaveReadingsResultDto
{
    public int Saved { get; set; }
    public decimal Total { get; set; }
}

// Resident: consumption history of one utility of one unit.
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
    public decimal Consumption { get; set; }
    public decimal Amount { get; set; }
}
