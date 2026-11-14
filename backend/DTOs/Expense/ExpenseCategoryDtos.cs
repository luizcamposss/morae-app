namespace backend.DTOs.Expense;

public class ExpenseCategoryResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    // Icon of a default category; null for the ones the condominium created.
    public string? IconKey { get; set; }
    public int ExpenseCount { get; set; }
}

public class SaveExpenseCategoryDto
{
    public string Name { get; set; } = string.Empty;
}
