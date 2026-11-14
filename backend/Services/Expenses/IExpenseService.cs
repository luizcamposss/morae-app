using backend.DTOs.Expense;

namespace backend.Services.Expenses;

public interface IExpenseService
{
    Task<IEnumerable<ExpenseCategoryResponseDto>> GetCategoriesAsync(int userId, int condominiumId);
    Task<ExpenseCategoryResponseDto> CreateCategoryAsync(int userId, int condominiumId, SaveExpenseCategoryDto dto);
    Task<ExpenseCategoryResponseDto> UpdateCategoryAsync(int userId, int categoryId, SaveExpenseCategoryDto dto);
    Task DeleteCategoryAsync(int userId, int categoryId);

    Task<IEnumerable<ExpenseResponseDto>> GetByMonthAsync(int userId, int condominiumId, string? month, int? categoryId);
    Task<ExpenseResponseDto> CreateAsync(int userId, int condominiumId, SaveExpenseDto dto);
    Task<ExpenseResponseDto> UpdateAsync(int userId, int expenseId, SaveExpenseDto dto);
    Task DeleteAsync(int userId, int expenseId);
    Task<ExpenseReceiptDownload> DownloadReceiptAsync(int userId, int expenseId);

    Task<MonthlyBalanceDto> GetMonthlyBalanceAsync(int userId, int condominiumId, string? month);
}
