using System.ComponentModel.DataAnnotations;
using backend.DTOs.Charge;
using backend.Enums;

namespace backend.DTOs.Invoice;

// One monthly bill (a charge with category MonthlyBill) in the management's "Contas do mês".
public class InvoiceResponseDto
{
    public int ChargeId { get; set; }
    public int UnitId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    // Null = everyone linked to the unit pays it; set = only this person (e.g. the tenant).
    public int? RecipientPersonId { get; set; }
    public string? RecipientName { get; set; }
    public ChargeStatus Status { get; set; }
    public DateTime DueDate { get; set; }
    public decimal Value { get; set; }
    public DateTime? SentAt { get; set; }
    public List<ChargeItemDto> Items { get; set; } = [];
}

public class InvoiceMonthDto
{
    public int CondominiumId { get; set; }
    // "AAAA-MM"
    public string Month { get; set; } = string.Empty;
    // Due date a new bill of this month gets (the condominium's due day).
    public DateTime DefaultDueDate { get; set; }
    public int? AutoSendDaysBefore { get; set; }
    public List<InvoiceResponseDto> Invoices { get; set; } = [];
}

public class AddInvoiceItemDto
{
    [Required]
    public int UnitId { get; set; }

    // Only this person (linked to the unit) gets the bill; null = everyone linked to the unit.
    public int? RecipientPersonId { get; set; }

    // "AAAA-MM": the month of the bill.
    [Required]
    public string Month { get; set; } = string.Empty;

    [EnumDataType(typeof(ChargeCategory))]
    public ChargeCategory Category { get; set; } = ChargeCategory.Other;

    [Required]
    [StringLength(150)]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, 1_000_000)]
    public decimal Amount { get; set; }
}

public class UpdateInvoiceItemDto
{
    [EnumDataType(typeof(ChargeCategory))]
    public ChargeCategory Category { get; set; } = ChargeCategory.Other;

    [Required]
    [StringLength(150)]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, 1_000_000)]
    public decimal Amount { get; set; }
}

public class UpdateInvoiceDto
{
    [Required]
    public DateTime DueDate { get; set; }
}

public class SendInvoicesDto
{
    [Required]
    public string Month { get; set; } = string.Empty;

    // Null = every draft of the month the user manages.
    public List<int>? ChargeIds { get; set; }
}

public class SendInvoicesResultDto
{
    public int Sent { get; set; }
}

// "Lançar cobrança" (#209): one item for several units, into each one's bill of the month.
public class LaunchChargeDto
{
    [Required]
    public string Month { get; set; } = string.Empty;

    [EnumDataType(typeof(ChargeCategory))]
    public ChargeCategory Category { get; set; } = ChargeCategory.Other;

    [Required]
    [StringLength(150)]
    public string Description { get; set; } = string.Empty;

    // The units and each one's amount.
    [Required]
    public List<LaunchUnitValueDto> Units { get; set; } = [];

    // Only this person of the unit gets the item (one unit only); empty = whoever pays the unit's bills.
    public int? RecipientPersonId { get; set; }
}

public class LaunchUnitValueDto
{
    public int UnitId { get; set; }

    [Range(0.01, 1_000_000)]
    public decimal Amount { get; set; }
}

public class LaunchChargeResultDto
{
    public int CreatedCount { get; set; }
    public decimal Total { get; set; }
    // Units with nobody linked: nobody would see the bill.
    public List<string> Skipped { get; set; } = [];
}
