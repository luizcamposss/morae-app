using System.Globalization;
using backend.Constants;
using backend.Data;
using backend.DTOs.Consumption;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.Invoices;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Consumption;

// Water, light and gas per unit (module "Consumo", #209): the management types each month's amount
// in R$; it goes as an item into the monthly bill of whoever pays the unit's condominium bills.
public class ConsumptionService : IConsumptionService
{
    private static readonly ChargeCategory[] Utilities = [ChargeCategory.Water, ChargeCategory.Electricity, ChargeCategory.Gas];

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IInvoiceService _invoiceService;

    public ConsumptionService(AppDbContext context, IPermissionService permissionService, IInvoiceService invoiceService)
    {
        _context = context;
        _permissionService = permissionService;
        _invoiceService = invoiceService;
    }

    public async Task<UtilitySettingsDto> SaveSettingsAsync(int userId, int condominiumId, UtilitySettingsDto dto)
    {
        // What the condominium bills is a billing rule, like fine and interest: Admin only.
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Consumption);

        if (dto.Utilities.Any(category => !Utilities.Contains(category)))
            throw new BadRequestException("Escolha entre água, luz e gás.");

        var condominium = await _context.Condominiums.FirstAsync(c => c.Id == condominiumId);
        condominium.BilledUtilities = string.Join(',', Utilities.Where(dto.Utilities.Contains).Select(category => (int)category));
        condominium.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new UtilitySettingsDto { Utilities = ParseUtilities(condominium.BilledUtilities) };
    }

    public async Task<UtilityMonthDto> GetMonthAsync(int userId, int condominiumId, string? month)
    {
        await EnsureCanViewAsync(userId, condominiumId);

        var start = ParseMonth(month);
        var units = await ManagedUnitsAsync(userId, condominiumId);
        var unitIds = units.Select(unit => unit.Id).ToList();
        var billed = await _context.Condominiums.Where(c => c.Id == condominiumId).Select(c => c.BilledUtilities).FirstAsync();

        var amounts = await _context.UtilityCharges
            .AsNoTracking()
            .Where(row => unitIds.Contains(row.UnitId) && row.Month == start)
            .ToListAsync();

        var lockedItemIds = await LockedItemIdsAsync(amounts.Select(row => row.ChargeItemId));
        var payerNames = await PayerNamesAsync(unitIds, start);

        return new UtilityMonthDto
        {
            Month = start.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            Utilities = ParseUtilities(billed),
            Rows = units.Select(unit => new UtilityRowDto
            {
                UnitId = unit.Id,
                UnitNumber = unit.Number,
                BuildingName = unit.Building.Name,
                PayerName = payerNames.GetValueOrDefault(unit.Id),
                Amounts = amounts
                    .Where(row => row.UnitId == unit.Id)
                    .Select(row => new UtilityAmountDto
                    {
                        Category = row.Category,
                        Amount = row.Amount,
                        IsLocked = row.ChargeItemId is { } itemId && lockedItemIds.Contains(itemId)
                    })
                    .ToList()
            }).ToList()
        };
    }

    public async Task<SaveUtilitiesResultDto> SaveMonthAsync(int userId, int condominiumId, SaveUtilitiesDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ChargesCreate);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Consumption);

        var start = ParseMonth(dto.Month);
        var units = (await ManagedUnitsAsync(userId, condominiumId)).ToDictionary(unit => unit.Id);
        var unitIds = dto.Amounts.Select(row => row.UnitId).Distinct().ToList();

        var stored = await _context.UtilityCharges
            .Where(row => unitIds.Contains(row.UnitId) && row.Month == start)
            .ToListAsync();
        var lockedItemIds = await LockedItemIdsAsync(stored.Select(row => row.ChargeItemId));

        // Everything is checked before anything is saved.
        foreach (var row in dto.Amounts)
        {
            if (!units.TryGetValue(row.UnitId, out var unit))
                throw new BadRequestException("Uma das unidades não é deste condomínio ou não é do seu prédio.");

            if (!Utilities.Contains(row.Category))
                throw new BadRequestException("Os valores são de água, luz e gás.");

            if (row.Amount is < 0)
                throw new BadRequestException("Informe um valor positivo.");

            var existing = stored.FirstOrDefault(item => item.UnitId == row.UnitId && item.Category == row.Category);

            if (existing?.ChargeItemId is { } itemId && lockedItemIds.Contains(itemId) && existing.Amount != Math.Round(row.Amount ?? 0, 2))
                throw new BadRequestException($"{unit.Building.Name} · {unit.Number}: a conta deste mês já foi enviada; o valor não pode mais mudar.");
        }

        var saved = 0;
        decimal total = 0;

        foreach (var row in dto.Amounts)
        {
            var amount = Math.Round(row.Amount ?? 0, 2);
            var existing = stored.FirstOrDefault(item => item.UnitId == row.UnitId && item.Category == row.Category);

            if (existing is not null && existing.Amount == amount)
            {
                total += amount;
                continue;
            }

            if (existing?.ChargeItemId is { } oldItemId)
                await _invoiceService.RemoveDraftItemAsync(oldItemId);

            if (amount <= 0)
            {
                if (existing is not null)
                    _context.UtilityCharges.Remove(existing);

                await _context.SaveChangesAsync();
                continue;
            }

            var record = existing ?? new UtilityCharge
            {
                CondominiumId = condominiumId,
                UnitId = row.UnitId,
                Category = row.Category,
                Month = start,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            if (existing is null)
                _context.UtilityCharges.Add(record);

            // Recipient left open: the bill goes to whoever pays the unit's condominium bills (#208).
            var result = await _invoiceService.AddItemToDraftAsync(new InvoiceItemRequest(
                condominiumId, row.UnitId, null, start, row.Category, UtilityName(row.Category), amount, userId));

            record.Amount = amount;
            record.ChargeItemId = result.ItemId;
            record.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            saved++;
            total += amount;
        }

        return new SaveUtilitiesResultDto { Saved = saved, Total = total };
    }

    public async Task<List<ConsumptionHistoryDto>> GetMineAsync(int userId)
    {
        var personId = await _context.Users.Where(user => user.Id == userId).Select(user => user.PersonId).FirstOrDefaultAsync();
        var since = DateOnly.FromDateTime(AppTimeZone.Today).AddMonths(-11);
        since = new DateOnly(since.Year, since.Month, 1);

        var unitIds = await _context.PersonUnits.Where(link => link.PersonId == personId).Select(link => link.UnitId).Distinct().ToListAsync();
        // Only the units whose condominium bills this person pays (#208).
        var rules = await UnitPayers.GetRulesAsync(_context, unitIds);

        var rows = await _context.UtilityCharges
            .AsNoTracking()
            .Where(row =>
                row.Month >= since &&
                unitIds.Contains(row.UnitId) &&
                row.Condominium.Status == Status.Active &&
                row.Condominium.EnabledModules.Contains(AppModules.Consumption))
            .Select(row => new { row.UnitId, UnitLabel = row.Unit.Building.Name + " · " + row.Unit.Number, row.Category, row.Month, row.Amount })
            .ToListAsync();

        return rows
            .Where(row => rules[row.UnitId].For(row.Month.ToDateTime(TimeOnly.MinValue)).Contains(personId))
            .GroupBy(row => new { row.UnitId, row.UnitLabel, row.Category })
            .OrderBy(group => group.Key.UnitLabel)
            .ThenBy(group => group.Key.Category)
            .Select(group => new ConsumptionHistoryDto
            {
                UnitId = group.Key.UnitId,
                UnitLabel = group.Key.UnitLabel,
                Category = group.Key.Category,
                Months = group
                    .OrderBy(row => row.Month)
                    .Select(row => new ConsumptionPointDto { Month = row.Month.ToString("yyyy-MM", CultureInfo.InvariantCulture), Amount = row.Amount })
                    .ToList()
            })
            .ToList();
    }

    // Who pays each unit's condominium bills that month, for the "Para" column.
    private async Task<Dictionary<int, string>> PayerNamesAsync(List<int> unitIds, DateOnly month)
    {
        var rules = await UnitPayers.GetRulesAsync(_context, unitIds);
        var personIds = rules.Values.SelectMany(rule => rule.For(month.ToDateTime(TimeOnly.MinValue))).Distinct().ToList();
        var names = await _context.Persons.AsNoTracking().Where(person => personIds.Contains(person.Id)).ToDictionaryAsync(person => person.Id, person => person.Name);

        return rules.ToDictionary(
            pair => pair.Key,
            pair => string.Join(", ", pair.Value.For(month.ToDateTime(TimeOnly.MinValue)).Select(id => names.GetValueOrDefault(id)).Where(name => name is not null)));
    }

    // Items whose bill already left the draft.
    private async Task<HashSet<int>> LockedItemIdsAsync(IEnumerable<int?> itemIds)
    {
        var ids = itemIds.Where(id => id.HasValue).Select(id => id!.Value).ToList();

        if (ids.Count == 0)
            return [];

        return (await _context.ChargeItems
            .AsNoTracking()
            .Where(item => ids.Contains(item.Id) && item.Charge.Status != ChargeStatus.Draft)
            .Select(item => item.Id)
            .ToListAsync()).ToHashSet();
    }

    private async Task<List<Unit>> ManagedUnitsAsync(int userId, int condominiumId)
    {
        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        var query = _context.Units
            .AsNoTracking()
            .Include(unit => unit.Building)
            .Where(unit => unit.Building.CondominiumId == condominiumId);

        if (managedBuildingIds is not null)
            query = query.Where(unit => managedBuildingIds.Contains(unit.BuildingId));

        var units = await query.ToListAsync();

        return units
            .OrderBy(unit => unit.Building.Name)
            .ThenBy(unit => unit.Number.Length)
            .ThenBy(unit => unit.Number)
            .ToList();
    }

    // Same access as the charges list: Admin, or a syndic with finance access.
    private async Task EnsureCanViewAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Consumption);
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);

        if (role == AppRoles.Admin)
            return;

        if (role != AppRoles.Syndic)
            throw new ForbiddenException("Você não tem acesso a água, luz e gás deste condomínio.");

        await _permissionService.EnsureAnyCondominiumPermissionAsync(userId, condominiumId, AppPermissions.FinanceAccess);
    }

    private static List<ChargeCategory> ParseUtilities(string? value) =>
        (value ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => int.TryParse(part, out var number) ? (ChargeCategory)number : 0)
            .Where(Utilities.Contains)
            .ToList();

    private static string UtilityName(ChargeCategory category) => category switch
    {
        ChargeCategory.Water => "Água",
        ChargeCategory.Electricity => "Luz",
        _ => "Gás"
    };

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
}
