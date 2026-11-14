using backend.Enums;

namespace backend.DTOs.Expense;

// Monthly balance ("prestação de contas"): money in (payments received in the month, by charge
// category) and money out (expenses paid in the month, by expense category).
public class MonthlyBalanceDto
{
    public int CondominiumId { get; set; }
    // "AAAA-MM".
    public string Month { get; set; } = string.Empty;

    // False for residents: expense categories bring totals and receipts, without the items.
    public bool IsDetailed { get; set; }

    public decimal IncomeTotal { get; set; }
    public List<BalanceIncomeCategoryDto> Income { get; set; } = [];

    public decimal ExpenseTotal { get; set; }
    public List<BalanceExpenseCategoryDto> Expenses { get; set; } = [];

    // IncomeTotal - ExpenseTotal.
    public decimal MonthBalance { get; set; }

    public decimal OpeningBalance { get; set; }
    public DateOnly? OpeningBalanceMonth { get; set; }

    // Cash at the start and at the end of the month, counting from the opening balance.
    // Null when the month is before OpeningBalanceMonth.
    public decimal? PreviousBalance { get; set; }
    public decimal? AccumulatedBalance { get; set; }
}

public class BalanceIncomeCategoryDto
{
    public ChargeCategory Category { get; set; }
    public string Label { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public int PaymentCount { get; set; }
}

public class BalanceExpenseCategoryDto
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconKey { get; set; }
    public decimal Total { get; set; }
    public int ExpenseCount { get; set; }
    public List<BalanceReceiptDto> Receipts { get; set; } = [];
    // Only for the management (IsDetailed); null for residents.
    public List<ExpenseResponseDto>? Items { get; set; }
}

public class BalanceReceiptDto
{
    public int ExpenseId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public DateOnly PaidOn { get; set; }
}
