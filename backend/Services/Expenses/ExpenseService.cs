using System.Globalization;
using backend.Constants;
using backend.Data;
using backend.DTOs.Expense;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using backend.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Expenses;

// Expenses the condominium paid and the monthly balance ("prestação de contas").
// Managing expenses: Admin or syndic with "expenses.manage" (a syndic limited to some buildings only
// sees and manages the expenses of those buildings). The balance and the receipts are open to every
// active member; residents get the totals by category, without the list of expenses.
public class ExpenseService : IExpenseService
{
    // Receipts are invoices, bank slips or screenshots of a transfer.
    private static readonly HashSet<string> ReceiptContentTypes = ["application/pdf", "image/jpeg", "image/png"];

    private static readonly (string IconKey, string Name)[] DefaultCategories =
    [
        ("water", "Água"),
        ("electricity", "Luz"),
        ("gas", "Gás"),
        ("payroll", "Folha e encargos"),
        ("cleaning", "Limpeza"),
        ("maintenance", "Manutenção"),
        ("security", "Segurança"),
        ("administration", "Administração"),
        ("insurance", "Seguros"),
        ("taxes", "Impostos e taxas"),
        ("other", "Outros")
    ];

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IFileStorage _fileStorage;
    private readonly ILogger<ExpenseService> _logger;

    public ExpenseService(
        AppDbContext context,
        IPermissionService permissionService,
        IFileStorage fileStorage,
        ILogger<ExpenseService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    public async Task<IEnumerable<ExpenseCategoryResponseDto>> GetCategoriesAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ExpensesManage);

        await EnsureDefaultCategoriesAsync(condominiumId);

        return await _context.ExpenseCategories
            .AsNoTracking()
            .Where(category => category.CondominiumId == condominiumId)
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .Select(category => new ExpenseCategoryResponseDto
            {
                Id = category.Id,
                Name = category.Name,
                IconKey = category.IconKey,
                ExpenseCount = _context.Expenses.Count(expense => expense.ExpenseCategoryId == category.Id)
            })
            .ToListAsync();
    }

    public async Task<ExpenseCategoryResponseDto> CreateCategoryAsync(int userId, int condominiumId, SaveExpenseCategoryDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ExpensesManage);

        await EnsureDefaultCategoriesAsync(condominiumId);

        var name = ValidateCategoryName(dto.Name);
        await EnsureCategoryNameIsFreeAsync(condominiumId, name, null);

        // Custom categories go after the default ones, "Outros" included.
        var lastOrder = await _context.ExpenseCategories
            .Where(category => category.CondominiumId == condominiumId)
            .MaxAsync(category => (int?)category.SortOrder) ?? 0;

        var category = new ExpenseCategory
        {
            CondominiumId = condominiumId,
            Name = name,
            SortOrder = lastOrder + 1,
            CreatedAt = DateTime.UtcNow
        };

        _context.ExpenseCategories.Add(category);
        await _context.SaveChangesAsync();

        return new ExpenseCategoryResponseDto { Id = category.Id, Name = category.Name, IconKey = null, ExpenseCount = 0 };
    }

    public async Task<ExpenseCategoryResponseDto> UpdateCategoryAsync(int userId, int categoryId, SaveExpenseCategoryDto dto)
    {
        var category = await _context.ExpenseCategories.FirstOrDefaultAsync(item => item.Id == categoryId)
            ?? throw new NotFoundException("Categoria não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId, category.CondominiumId, AppPermissions.ExpensesManage);

        var name = ValidateCategoryName(dto.Name);
        await EnsureCategoryNameIsFreeAsync(category.CondominiumId, name, category.Id);

        category.Name = name;
        await _context.SaveChangesAsync();

        return new ExpenseCategoryResponseDto
        {
            Id = category.Id,
            Name = category.Name,
            IconKey = category.IconKey,
            ExpenseCount = await _context.Expenses.CountAsync(expense => expense.ExpenseCategoryId == category.Id)
        };
    }

    public async Task DeleteCategoryAsync(int userId, int categoryId)
    {
        var category = await _context.ExpenseCategories.FirstOrDefaultAsync(item => item.Id == categoryId)
            ?? throw new NotFoundException("Categoria não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId, category.CondominiumId, AppPermissions.ExpensesManage);

        if (await _context.Expenses.AnyAsync(expense => expense.ExpenseCategoryId == categoryId))
            throw new BadRequestException("Esta categoria tem despesas lançadas. Mude a categoria delas antes de apagar.");

        var remaining = await _context.ExpenseCategories
            .CountAsync(item => item.CondominiumId == category.CondominiumId && item.Id != categoryId);

        if (remaining == 0)
            throw new BadRequestException("O condomínio precisa de pelo menos uma categoria de despesa.");

        _context.ExpenseCategories.Remove(category);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<ExpenseResponseDto>> GetByMonthAsync(
        int userId,
        int condominiumId,
        string? month,
        int? categoryId)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ExpensesManage);

        var start = ParseMonth(month);
        var end = start.AddMonths(1);

        var query = _context.Expenses
            .AsNoTracking()
            .Where(expense =>
                expense.CondominiumId == condominiumId &&
                expense.PaidOn >= start &&
                expense.PaidOn < end &&
                (categoryId == null || expense.ExpenseCategoryId == categoryId));

        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        if (managedBuildingIds is not null)
            query = query.Where(expense => expense.BuildingId.HasValue && managedBuildingIds.Contains(expense.BuildingId.Value));

        return await query
            .OrderByDescending(expense => expense.PaidOn)
            .ThenByDescending(expense => expense.Id)
            .Select(ToResponse())
            .ToListAsync();
    }

    public async Task<ExpenseResponseDto> CreateAsync(int userId, int condominiumId, SaveExpenseDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ExpensesManage);

        var details = await ValidateDetailsAsync(userId, condominiumId, dto);

        var expense = new Expense
        {
            CondominiumId = condominiumId,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        ApplyDetails(expense, details);

        // File first, then the record: if saving the record fails, the file is removed again.
        var receiptKey = await SaveReceiptAsync(expense, dto.File);

        try
        {
            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();
        }
        catch
        {
            if (receiptKey is not null)
                await _fileStorage.DeleteAsync(receiptKey);
            throw;
        }

        return await GetResponseAsync(expense.Id);
    }

    public async Task<ExpenseResponseDto> UpdateAsync(int userId, int expenseId, SaveExpenseDto dto)
    {
        var expense = await GetManagedExpenseAsync(userId, expenseId);

        var details = await ValidateDetailsAsync(userId, expense.CondominiumId, dto);

        ApplyDetails(expense, details);

        var oldReceiptKey = expense.ReceiptStorageKey;
        var newReceiptKey = await SaveReceiptAsync(expense, dto.File);

        if (newReceiptKey is null && dto.RemoveReceipt)
        {
            expense.ReceiptFileName = null;
            expense.ReceiptContentType = null;
            expense.ReceiptSizeBytes = null;
            expense.ReceiptStorageKey = null;
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch
        {
            if (newReceiptKey is not null)
                await _fileStorage.DeleteAsync(newReceiptKey);
            throw;
        }

        if (oldReceiptKey is not null && oldReceiptKey != expense.ReceiptStorageKey)
            await DeleteFileQuietlyAsync(oldReceiptKey, expense.Id);

        return await GetResponseAsync(expense.Id);
    }

    public async Task DeleteAsync(int userId, int expenseId)
    {
        var expense = await GetManagedExpenseAsync(userId, expenseId);

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();

        if (expense.ReceiptStorageKey is not null)
            await DeleteFileQuietlyAsync(expense.ReceiptStorageKey, expense.Id);
    }

    public async Task<ExpenseReceiptDownload> DownloadReceiptAsync(int userId, int expenseId)
    {
        var expense = await _context.Expenses
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == expenseId)
            ?? throw new NotFoundException("Comprovante não encontrado.");

        // Receipts are part of the balance, which every active member may see.
        if (!await _permissionService.HasCondominiumAccessAsync(userId, expense.CondominiumId) ||
            expense.ReceiptStorageKey is null)
            throw new NotFoundException("Comprovante não encontrado.");

        await _permissionService.EnsureModuleEnabledAsync(expense.CondominiumId, AppModules.Expenses);

        var content = await _fileStorage.OpenReadAsync(expense.ReceiptStorageKey);

        if (content is null)
        {
            _logger.LogError("Receipt of expense {ExpenseId} is missing from storage.", expenseId);
            throw new NotFoundException("O arquivo deste comprovante não está disponível. Avise a administração.");
        }

        return new ExpenseReceiptDownload(content, expense.ReceiptContentType!, expense.ReceiptFileName!);
    }

    public async Task<MonthlyBalanceDto> GetMonthlyBalanceAsync(int userId, int condominiumId, string? month)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Expenses);

        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);
        var isDetailed = role is AppRoles.Admin or AppRoles.Syndic;

        var condominium = await _context.Condominiums
            .AsNoTracking()
            .Where(item => item.Id == condominiumId)
            .Select(item => new { item.OpeningBalance, item.OpeningBalanceMonth })
            .FirstAsync();

        var start = ParseMonth(month);
        var end = start.AddMonths(1);
        var (startUtc, endUtc) = (ToUtcInstant(start), ToUtcInstant(end));

        // Money in = payments of the condominium's own charges, on the day they were paid
        // (platform invoices are the condominium's bills to Moraê, not income).
        var payments = await IncomePayments(condominiumId)
            .Where(payment => payment.PaidAt >= startUtc && payment.PaidAt < endUtc)
            .Select(payment => new { payment.ChargeId, payment.Charge.Category, payment.AmountPaid })
            .ToListAsync();

        // A monthly bill is split among its items' categories, in proportion to each item
        // (the fine and interest paid follow the same proportion).
        var billIds = payments.Where(payment => payment.Category == ChargeCategory.MonthlyBill).Select(payment => payment.ChargeId).Distinct().ToList();
        var billItems = billIds.Count == 0
            ? []
            : await _context.ChargeItems
                .AsNoTracking()
                .Where(item => billIds.Contains(item.ChargeId))
                .Select(item => new { item.ChargeId, item.Category, item.Amount })
                .ToListAsync();

        var income = payments
            .SelectMany(payment =>
            {
                var items = billItems.Where(item => item.ChargeId == payment.ChargeId).ToList();
                var itemsTotal = items.Sum(item => item.Amount);

                if (payment.Category != ChargeCategory.MonthlyBill || itemsTotal <= 0)
                    return new[] { (payment.ChargeId, payment.Category, Amount: payment.AmountPaid) };

                var shares = items
                    .GroupBy(item => item.Category)
                    .Select(group => (payment.ChargeId, Category: group.Key, Amount: Math.Round(payment.AmountPaid * group.Sum(item => item.Amount) / itemsTotal, 2)))
                    .ToArray();
                // Rounding leftovers go to the largest share, so the parts add up to what was paid.
                var leftover = payment.AmountPaid - shares.Sum(share => share.Amount);
                var largest = Array.IndexOf(shares, shares.MaxBy(share => share.Amount));
                shares[largest].Amount += leftover;
                return shares;
            })
            .GroupBy(share => share.Category)
            .Select(group => new { Category = group.Key, Total = group.Sum(share => share.Amount), Count = group.Select(share => share.ChargeId).Count() })
            .ToList();

        var expenses = await _context.Expenses
            .AsNoTracking()
            .Where(expense => expense.CondominiumId == condominiumId && expense.PaidOn >= start && expense.PaidOn < end)
            .OrderBy(expense => expense.PaidOn)
            .ThenBy(expense => expense.Id)
            .Select(ToResponse())
            .ToListAsync();

        var categoryOrder = await _context.ExpenseCategories
            .AsNoTracking()
            .Where(category => category.CondominiumId == condominiumId)
            .Select(category => new { category.Id, category.SortOrder })
            .ToDictionaryAsync(category => category.Id, category => category.SortOrder);

        var balance = new MonthlyBalanceDto
        {
            CondominiumId = condominiumId,
            Month = start.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            IsDetailed = isDetailed,
            Income = income
                .OrderByDescending(item => item.Total)
                .Select(item => new BalanceIncomeCategoryDto
                {
                    Category = item.Category,
                    Label = GetChargeCategoryLabel(item.Category),
                    Total = item.Total,
                    PaymentCount = item.Count
                })
                .ToList(),
            Expenses = expenses
                .GroupBy(expense => expense.CategoryId)
                .OrderBy(group => categoryOrder.GetValueOrDefault(group.Key))
                .Select(group => new BalanceExpenseCategoryDto
                {
                    CategoryId = group.Key,
                    Name = group.First().CategoryName,
                    IconKey = group.First().CategoryIconKey,
                    Total = group.Sum(expense => expense.Amount),
                    ExpenseCount = group.Count(),
                    Receipts = group
                        .Where(expense => expense.HasReceipt)
                        .Select(expense => new BalanceReceiptDto
                        {
                            ExpenseId = expense.Id,
                            FileName = expense.ReceiptFileName!,
                            PaidOn = expense.PaidOn
                        })
                        .ToList(),
                    Items = isDetailed ? group.ToList() : null
                })
                .ToList(),
            OpeningBalance = condominium.OpeningBalance,
            OpeningBalanceMonth = condominium.OpeningBalanceMonth
        };

        balance.IncomeTotal = balance.Income.Sum(item => item.Total);
        balance.ExpenseTotal = balance.Expenses.Sum(item => item.Total);
        balance.MonthBalance = balance.IncomeTotal - balance.ExpenseTotal;

        // Accumulated cash: the opening balance plus every month from the opening month on.
        if (condominium.OpeningBalanceMonth is null || start >= condominium.OpeningBalanceMonth)
        {
            var from = condominium.OpeningBalanceMonth;
            var fromUtc = from.HasValue ? ToUtcInstant(from.Value) : (DateTime?)null;

            var incomeBefore = await IncomePayments(condominiumId)
                .Where(payment => (fromUtc == null || payment.PaidAt >= fromUtc) && payment.PaidAt < startUtc)
                .SumAsync(payment => (decimal?)payment.AmountPaid) ?? 0m;

            var expensesBefore = await _context.Expenses
                .Where(expense =>
                    expense.CondominiumId == condominiumId &&
                    (from == null || expense.PaidOn >= from) &&
                    expense.PaidOn < start)
                .SumAsync(expense => (decimal?)expense.Amount) ?? 0m;

            balance.PreviousBalance = condominium.OpeningBalance + incomeBefore - expensesBefore;
            balance.AccumulatedBalance = balance.PreviousBalance + balance.MonthBalance;
        }

        return balance;
    }

    private IQueryable<Payment> IncomePayments(int condominiumId)
    {
        return _context.Payments
            .AsNoTracking()
            .Where(payment =>
                payment.Charge.CondominiumId == condominiumId &&
                payment.Charge.Scope == ChargeScope.Condominium &&
                // The owner's rent is the owner's money, not the condominium's income.
                payment.Charge.ReceiverPersonId == null);
    }

    private async Task EnsureDefaultCategoriesAsync(int condominiumId)
    {
        if (await _context.ExpenseCategories.AnyAsync(category => category.CondominiumId == condominiumId))
            return;

        var categories = DefaultCategories
            .Select((item, index) => new ExpenseCategory
            {
                CondominiumId = condominiumId,
                Name = item.Name,
                IconKey = item.IconKey,
                SortOrder = index + 1,
                CreatedAt = DateTime.UtcNow
            })
            .ToList();

        _context.ExpenseCategories.AddRange(categories);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Another request created the list at the same time (unique name per condominium).
            foreach (var category in categories)
                _context.Entry(category).State = EntityState.Detached;
        }
    }

    private async Task<Expense> GetManagedExpenseAsync(int userId, int expenseId)
    {
        var expense = await _context.Expenses.FirstOrDefaultAsync(item => item.Id == expenseId)
            ?? throw new NotFoundException("Despesa não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId, expense.CondominiumId, AppPermissions.ExpensesManage);

        // Same answer as a missing expense for a syndic who does not manage its building.
        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, expense.CondominiumId);

        if (managedBuildingIds is not null &&
            (!expense.BuildingId.HasValue || !managedBuildingIds.Contains(expense.BuildingId.Value)))
            throw new NotFoundException("Despesa não encontrada.");

        return expense;
    }

    private sealed record ExpenseDetails(
        int CategoryId,
        decimal Amount,
        DateOnly PaidOn,
        string? Supplier,
        int? BuildingId,
        string? Description);

    private async Task<ExpenseDetails> ValidateDetailsAsync(int userId, int condominiumId, SaveExpenseDto dto)
    {
        var categoryExists = await _context.ExpenseCategories
            .AnyAsync(category => category.Id == dto.CategoryId && category.CondominiumId == condominiumId);

        if (!categoryExists)
            throw new BadRequestException("Escolha o que foi pago (a categoria da despesa).");

        if (!decimal.TryParse(dto.Amount?.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) ||
            amount <= 0)
            throw new BadRequestException("Informe o valor pago.");

        if (amount > 9_999_999_999m)
            throw new BadRequestException("Informe um valor válido.");

        if (dto.PaidOn is null)
            throw new BadRequestException("Informe a data do pagamento.");

        if (dto.PaidOn.Value > DateOnly.FromDateTime(AppTimeZone.Today))
            throw new BadRequestException("A data do pagamento não pode ser no futuro. Lance a despesa depois de pagar.");

        if (dto.PaidOn.Value.Year < 2000)
            throw new BadRequestException("Informe uma data de pagamento válida.");

        var supplier = string.IsNullOrWhiteSpace(dto.Supplier) ? null : dto.Supplier.Trim();
        if (supplier?.Length > 150)
            throw new BadRequestException("O fornecedor pode ter no máximo 150 caracteres.");

        var description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        if (description?.Length > 255)
            throw new BadRequestException("A descrição pode ter no máximo 255 caracteres.");

        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        if (dto.BuildingId.HasValue)
        {
            var buildingExists = await _context.Buildings
                .AnyAsync(building => building.Id == dto.BuildingId.Value && building.CondominiumId == condominiumId);

            if (!buildingExists)
                throw new BadRequestException("Este prédio não pertence a este condomínio.");

            if (managedBuildingIds is not null && !managedBuildingIds.Contains(dto.BuildingId.Value))
                throw new ForbiddenException("Você não cuida deste prédio.");
        }
        else if (managedBuildingIds is not null)
        {
            throw new BadRequestException("Escolha o prédio da despesa.");
        }

        return new ExpenseDetails(dto.CategoryId, Math.Round(amount, 2), dto.PaidOn.Value, supplier, dto.BuildingId, description);
    }

    private static void ApplyDetails(Expense expense, ExpenseDetails details)
    {
        expense.ExpenseCategoryId = details.CategoryId;
        expense.Amount = details.Amount;
        expense.PaidOn = details.PaidOn;
        expense.Supplier = details.Supplier;
        expense.BuildingId = details.BuildingId;
        expense.Description = details.Description;
        expense.UpdatedAt = DateTime.UtcNow;
    }

    // Saves the new receipt (if any) and points the expense at it. Returns the new storage key.
    private async Task<string?> SaveReceiptAsync(Expense expense, IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return null;

        if (file.Length > UploadedFileInspector.MaxFileSizeBytes)
            throw new BadRequestException("O comprovante pode ter no máximo 20 MB.");

        await using var content = file.OpenReadStream();

        var detected = UploadedFileInspector.Detect(content);

        if (detected is null || !ReceiptContentTypes.Contains(detected.ContentType))
            throw new BadRequestException("Tipo de arquivo não aceito. Envie o comprovante em PDF, JPG ou PNG.");

        var key = $"expenses/{expense.CondominiumId}/{Guid.NewGuid():N}";

        await _fileStorage.SaveAsync(key, content);

        expense.ReceiptFileName = UploadedFileInspector.BuildFileName(file.FileName, detected, "comprovante");
        expense.ReceiptContentType = detected.ContentType;
        expense.ReceiptSizeBytes = file.Length;
        expense.ReceiptStorageKey = key;

        return key;
    }

    private async Task DeleteFileQuietlyAsync(string key, int expenseId)
    {
        try
        {
            await _fileStorage.DeleteAsync(key);
        }
        catch (Exception exception)
        {
            // The receipt is already gone for users; a leftover file only takes disk space.
            _logger.LogError(exception, "Could not delete a receipt file of expense {ExpenseId}.", expenseId);
        }
    }

    private static string ValidateCategoryName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new BadRequestException("Informe o nome da categoria.");

        var trimmed = name.Trim();

        if (trimmed.Length > 60)
            throw new BadRequestException("O nome da categoria pode ter no máximo 60 caracteres.");

        return trimmed;
    }

    private async Task EnsureCategoryNameIsFreeAsync(int condominiumId, string name, int? exceptId)
    {
        var taken = await _context.ExpenseCategories.AnyAsync(category =>
            category.CondominiumId == condominiumId &&
            category.Name == name &&
            category.Id != exceptId);

        if (taken)
            throw new BadRequestException("Já existe uma categoria com esse nome.");
    }

    // "AAAA-MM" (or a full date) → first day of that month; empty = the current month in São Paulo.
    private static DateOnly ParseMonth(string? month)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            var today = AppTimeZone.Today;
            return new DateOnly(today.Year, today.Month, 1);
        }

        if (DateOnly.TryParseExact(month.Trim(), ["yyyy-MM", "yyyy-MM-dd"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed) &&
            parsed.Year >= 2000 && parsed.Year <= 2100)
            return new DateOnly(parsed.Year, parsed.Month, 1);

        throw new BadRequestException("Informe o mês no formato AAAA-MM.");
    }

    // Start of a São Paulo calendar day as a UTC instant (payments are stored as instants).
    private static DateTime ToUtcInstant(DateOnly day)
    {
        return AppTimeZone.StartOfDayToUtc(day.ToDateTime(TimeOnly.MinValue));
    }

    private static string GetChargeCategoryLabel(ChargeCategory category)
    {
        return category switch
        {
            ChargeCategory.CondominiumFee => "Taxa de condomínio",
            ChargeCategory.Rent => "Aluguel",
            ChargeCategory.Water => "Água",
            ChargeCategory.Electricity => "Luz",
            ChargeCategory.Gas => "Gás",
            ChargeCategory.Apportionment => "Rateio",
            ChargeCategory.Fine => "Multa",
            ChargeCategory.Reservation => "Reserva",
            ChargeCategory.MonthlyBill => "Conta do mês",
            ChargeCategory.Agreement => "Acordo",
            _ => "Outros"
        };
    }

    private async Task<ExpenseResponseDto> GetResponseAsync(int expenseId)
    {
        return await _context.Expenses
            .AsNoTracking()
            .Where(expense => expense.Id == expenseId)
            .Select(ToResponse())
            .FirstAsync();
    }

    private static System.Linq.Expressions.Expression<Func<Expense, ExpenseResponseDto>> ToResponse()
    {
        return expense => new ExpenseResponseDto
        {
            Id = expense.Id,
            CondominiumId = expense.CondominiumId,
            CategoryId = expense.ExpenseCategoryId,
            CategoryName = expense.Category.Name,
            CategoryIconKey = expense.Category.IconKey,
            BuildingId = expense.BuildingId,
            BuildingName = expense.Building != null ? expense.Building.Name : null,
            Amount = expense.Amount,
            PaidOn = expense.PaidOn,
            Supplier = expense.Supplier,
            Description = expense.Description,
            HasReceipt = expense.ReceiptStorageKey != null,
            ReceiptFileName = expense.ReceiptFileName,
            ReceiptSizeBytes = expense.ReceiptSizeBytes,
            CreatedByName = expense.CreatedByUser.Person.Name,
            CreatedAt = expense.CreatedAt,
            UpdatedAt = expense.UpdatedAt
        };
    }
}
