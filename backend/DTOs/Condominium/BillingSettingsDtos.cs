using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Condominium;

public class BillingSettingsDto
{
    public int CondominiumId { get; set; }
    public int BillingDueDay { get; set; }
    public bool LateFeeEnabled { get; set; }
    public decimal FinePercent { get; set; }
    public decimal MonthlyInterestPercent { get; set; }
    public decimal MaxFinePercent { get; set; }
    public decimal MaxMonthlyInterestPercent { get; set; }

    // Monthly balance: cash at the start of OpeningBalanceMonth ("AAAA-MM-01"; null = from the start).
    public decimal OpeningBalance { get; set; }
    public DateOnly? OpeningBalanceMonth { get; set; }

    // Monthly bills: sent automatically this many days before they are due (null = only by hand).
    public int? InvoiceAutoSendDaysBefore { get; set; }
}

public class UpdateBillingSettingsDto
{
    [Required]
    [Range(1, 31)]
    public int BillingDueDay { get; set; }

    [Required]
    public bool LateFeeEnabled { get; set; }

    [Required]
    [Range(0, 2)]
    public decimal FinePercent { get; set; }

    [Required]
    [Range(0, 1)]
    public decimal MonthlyInterestPercent { get; set; }

    // Optional so older clients keep the current opening balance: omitted = unchanged.
    // Any day of the month is accepted; it is saved as the first day.
    public decimal? OpeningBalance { get; set; }
    public DateOnly? OpeningBalanceMonth { get; set; }

    // Optional so older clients keep the current choice: omitted = unchanged.
    // false = monthly bills are sent only by hand; true = InvoiceAutoSendDaysBefore days before.
    public bool? InvoiceAutoSend { get; set; }

    [Range(0, 28)]
    public int? InvoiceAutoSendDaysBefore { get; set; }
}

// The condominium fee charged every month (#211): one value per unit, with exceptions.
public class CondominiumFeeDto
{
    public bool Enabled { get; set; }
    public decimal Amount { get; set; }
    // Day it is due (the condominium's due day).
    public int DueDay { get; set; }
    public List<CondominiumFeeExceptionDto> Exceptions { get; set; } = [];
}

public class CondominiumFeeExceptionDto
{
    public int UnitId { get; set; }
    public string UnitLabel { get; set; } = string.Empty;
    // 0 = the unit is exempt.
    [Range(0, 1_000_000)]
    public decimal Amount { get; set; }
}

public class SaveCondominiumFeeDto
{
    public bool Enabled { get; set; }

    [Range(0, 1_000_000)]
    public decimal Amount { get; set; }

    public List<CondominiumFeeExceptionDto> Exceptions { get; set; } = [];
}
