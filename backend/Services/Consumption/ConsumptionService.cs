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

// Individual meters (module "Consumo"): prices per condominium, the month's readings typed by the
// management and the resulting items in the monthly bills.
public class ConsumptionService : IConsumptionService
{
    private static readonly ChargeCategory[] Utilities = [ChargeCategory.Water, ChargeCategory.Electricity, ChargeCategory.Gas];
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IInvoiceService _invoiceService;

    public ConsumptionService(AppDbContext context, IPermissionService permissionService, IInvoiceService invoiceService)
    {
        _context = context;
        _permissionService = permissionService;
        _invoiceService = invoiceService;
    }

    public async Task<List<UtilityRateDto>> GetRatesAsync(int userId, int condominiumId)
    {
        await EnsureCanViewAsync(userId, condominiumId);

        var rates = await _context.UtilityRates
            .AsNoTracking()
            .Where(rate => rate.CondominiumId == condominiumId)
            .ToListAsync();

        return Utilities
            .Select(category => rates.FirstOrDefault(rate => rate.Category == category) is { } rate
                ? ToDto(rate)
                : new UtilityRateDto { Category = category, Enabled = false })
            .ToList();
    }

    public async Task<List<UtilityRateDto>> SaveRatesAsync(int userId, int condominiumId, SaveUtilityRatesDto dto)
    {
        // Prices are a billing rule of the condominium, like fine and interest: Admin only.
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Consumption);

        var existing = await _context.UtilityRates.Where(rate => rate.CondominiumId == condominiumId).ToListAsync();

        foreach (var item in dto.Rates)
        {
            if (!Utilities.Contains(item.Category))
                throw new BadRequestException("Os preços são de água, luz e gás.");

            if (item.Enabled && item.PricePerUnit <= 0)
                throw new BadRequestException($"Informe o preço por {MeterUnit(item.Category)} de {UtilityName(item.Category).ToLowerInvariant()}.");

            var rate = existing.FirstOrDefault(row => row.Category == item.Category);

            if (rate is null)
            {
                rate = new UtilityRate { CondominiumId = condominiumId, Category = item.Category };
                _context.UtilityRates.Add(rate);
            }

            rate.Enabled = item.Enabled;
            rate.PricePerUnit = Math.Round(item.PricePerUnit, 4);
            rate.MinimumCharge = Math.Round(item.MinimumCharge, 2);
            rate.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return await GetRatesAsync(userId, condominiumId);
    }

    public async Task<ReadingMonthDto> GetMonthAsync(int userId, int condominiumId, string? month, ChargeCategory category)
    {
        await EnsureCanViewAsync(userId, condominiumId);
        EnsureUtility(category);

        var start = ParseMonth(month);
        var units = await ManagedUnitsAsync(userId, condominiumId);
        var unitIds = units.Select(unit => unit.Id).ToList();

        var readings = await _context.MeterReadings
            .AsNoTracking()
            .Where(reading => unitIds.Contains(reading.UnitId) && reading.Category == category && reading.Month <= start)
            .OrderByDescending(reading => reading.Month)
            .ToListAsync();

        var payers = await PayersAsync(condominiumId, category);
        var lockedItemIds = await LockedItemIdsAsync(readings.Where(reading => reading.Month == start).Select(reading => reading.ChargeItemId));
        var rate = await _context.UtilityRates.AsNoTracking().FirstOrDefaultAsync(row => row.CondominiumId == condominiumId && row.Category == category);

        return new ReadingMonthDto
        {
            Month = start.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            Category = category,
            Rate = rate is null ? null : ToDto(rate),
            Rows = units.Select(unit =>
            {
                var current = readings.FirstOrDefault(reading => reading.UnitId == unit.Id && reading.Month == start);
                var before = readings.Where(reading => reading.UnitId == unit.Id && reading.Month < start).ToList();
                var payer = payers.GetValueOrDefault(unit.Id);

                return new ReadingRowDto
                {
                    UnitId = unit.Id,
                    UnitNumber = unit.Number,
                    BuildingName = unit.Building.Name,
                    PayerPersonId = payer?.PersonId,
                    PayerName = payer?.Name,
                    PreviousReading = current?.PreviousReading ?? before.FirstOrDefault()?.CurrentReading,
                    CurrentReading = current?.CurrentReading,
                    Consumption = current?.Consumption,
                    Amount = current?.Amount,
                    AverageConsumption = before.Count == 0 ? null : Math.Round(before.Take(3).Average(reading => reading.Consumption), 3),
                    IsLocked = current?.ChargeItemId is { } itemId && lockedItemIds.Contains(itemId)
                };
            }).ToList()
        };
    }

    public async Task<SaveReadingsResultDto> SaveReadingsAsync(int userId, int condominiumId, SaveReadingsDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ChargesCreate);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Consumption);
        EnsureUtility(dto.Category);

        var start = ParseMonth(dto.Month);
        var rate = await _context.UtilityRates.AsNoTracking().FirstOrDefaultAsync(row => row.CondominiumId == condominiumId && row.Category == dto.Category);

        if (rate is not { Enabled: true })
            throw new BadRequestException($"Configure o preço de {UtilityName(dto.Category).ToLowerInvariant()} antes de lançar as leituras.");

        var units = (await ManagedUnitsAsync(userId, condominiumId)).ToDictionary(unit => unit.Id);
        var unitIds = dto.Readings.Select(row => row.UnitId).Distinct().ToList();

        if (unitIds.Count != dto.Readings.Count)
            throw new BadRequestException("Cada unidade aparece uma vez só.");

        var stored = await _context.MeterReadings
            .Where(reading => unitIds.Contains(reading.UnitId) && reading.Category == dto.Category && reading.Month <= start)
            .OrderByDescending(reading => reading.Month)
            .ToListAsync();

        var lockedItemIds = await LockedItemIdsAsync(stored.Where(reading => reading.Month == start).Select(reading => reading.ChargeItemId));
        var payers = await PayersAsync(condominiumId, dto.Category);
        var plans = new List<(SaveReadingDto Row, MeterReading? Existing, decimal Previous)>();

        // Everything is checked before anything is saved.
        foreach (var row in dto.Readings)
        {
            if (!units.TryGetValue(row.UnitId, out var unit))
                throw new BadRequestException("Uma das unidades não é deste condomínio ou não é do seu prédio.");

            var label = $"{unit.Building.Name} · {unit.Number}";
            var existing = stored.FirstOrDefault(reading => reading.UnitId == row.UnitId && reading.Month == start);

            if (existing?.ChargeItemId is { } itemId && lockedItemIds.Contains(itemId))
                throw new BadRequestException($"{label}: a conta deste mês já foi enviada; a leitura não pode mais mudar.");

            var previous = existing?.PreviousReading
                ?? stored.FirstOrDefault(reading => reading.UnitId == row.UnitId && reading.Month < start)?.CurrentReading
                ?? row.PreviousReading
                ?? throw new BadRequestException($"{label}: é a primeira leitura; informe também a leitura anterior.");

            if (row.CurrentReading < previous)
                throw new BadRequestException($"{label}: a leitura atual ({row.CurrentReading.ToString("0.###", PtBr)}) é menor que a anterior ({previous.ToString("0.###", PtBr)}).");

            plans.Add((row, existing, previous));
        }

        decimal total = 0;

        foreach (var (row, existing, previous) in plans)
        {
            var consumption = row.CurrentReading - previous;
            var amount = Math.Round(Math.Max(consumption * rate.PricePerUnit, rate.MinimumCharge), 2);
            var reading = existing ?? new MeterReading
            {
                CondominiumId = condominiumId,
                UnitId = row.UnitId,
                Category = dto.Category,
                Month = start,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            if (existing is null)
                _context.MeterReadings.Add(reading);

            // A corrected reading replaces its item in the draft bill.
            if (reading.ChargeItemId is { } oldItemId)
                await _invoiceService.RemoveDraftItemAsync(oldItemId);

            reading.PreviousReading = previous;
            reading.CurrentReading = row.CurrentReading;
            reading.Consumption = consumption;
            reading.Amount = amount;
            reading.ChargeItemId = null;
            reading.UpdatedAt = DateTime.UtcNow;

            if (amount > 0)
            {
                var payer = payers.GetValueOrDefault(row.UnitId);
                var result = await _invoiceService.AddItemToDraftAsync(new InvoiceItemRequest(
                    condominiumId,
                    row.UnitId,
                    payer?.PersonId,
                    start,
                    dto.Category,
                    $"{UtilityName(dto.Category)} ({consumption.ToString("0.###", PtBr)} {MeterUnit(dto.Category)})",
                    amount,
                    userId,
                    payer is null ? null : ChargeLateFees.DueDateIn(start.Year, start.Month, payer.DueDay)));

                reading.ChargeItemId = result.ItemId;
            }

            await _context.SaveChangesAsync();
            total += amount;
        }

        return new SaveReadingsResultDto { Saved = plans.Count, Total = total };
    }

    public async Task<List<ConsumptionHistoryDto>> GetMineAsync(int userId)
    {
        var personId = await _context.Users.Where(user => user.Id == userId).Select(user => user.PersonId).FirstOrDefaultAsync();
        var since = DateOnly.FromDateTime(AppTimeZone.Today).AddMonths(-11);
        since = new DateOnly(since.Year, since.Month, 1);

        var readings = await _context.MeterReadings
            .AsNoTracking()
            .Where(reading =>
                reading.Month >= since &&
                _context.PersonUnits.Any(link => link.PersonId == personId && link.UnitId == reading.UnitId) &&
                reading.Condominium.Status == Status.Active &&
                reading.Condominium.EnabledModules.Contains(AppModules.Consumption))
            .Select(reading => new
            {
                reading.UnitId,
                UnitLabel = reading.Unit.Building.Name + " · " + reading.Unit.Number,
                reading.Category,
                reading.Month,
                reading.Consumption,
                reading.Amount
            })
            .ToListAsync();

        return readings
            .GroupBy(reading => new { reading.UnitId, reading.UnitLabel, reading.Category })
            .OrderBy(group => group.Key.UnitLabel)
            .ThenBy(group => group.Key.Category)
            .Select(group => new ConsumptionHistoryDto
            {
                UnitId = group.Key.UnitId,
                UnitLabel = group.Key.UnitLabel,
                Category = group.Key.Category,
                Months = group
                    .OrderBy(reading => reading.Month)
                    .Select(reading => new ConsumptionPointDto
                    {
                        Month = reading.Month.ToString("yyyy-MM", CultureInfo.InvariantCulture),
                        Consumption = reading.Consumption,
                        Amount = reading.Amount
                    })
                    .ToList()
            })
            .ToList();
    }

    // Tenant who pays the condominium's bills, per unit (active contract with the tenant paying).
    private async Task<Dictionary<int, Payer>> PayersAsync(int condominiumId, ChargeCategory category)
    {
        var contracts = await _context.RentalContracts
            .AsNoTracking()
            .Where(contract =>
                contract.CondominiumId == condominiumId &&
                contract.Status == RentalContractStatus.Active &&
                // The tenant pays the condominium's bills when the contract says so (#208).
                contract.CondominiumBillsPaidBy == CondominiumBillsPayer.Tenant)
            .Select(contract => new { contract.UnitId, contract.TenantPersonId, contract.TenantPerson.Name, contract.DueDay })
            .ToListAsync();

        return contracts
            .GroupBy(contract => contract.UnitId)
            .ToDictionary(group => group.Key, group => new Payer(group.First().TenantPersonId, group.First().Name, group.First().DueDay));
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
            throw new ForbiddenException("Você não tem acesso às leituras deste condomínio.");

        await _permissionService.EnsureAnyCondominiumPermissionAsync(userId, condominiumId, AppPermissions.FinanceAccess);
    }

    private static void EnsureUtility(ChargeCategory category)
    {
        if (!Utilities.Contains(category))
            throw new BadRequestException("As leituras são de água, luz e gás.");
    }

    private static UtilityRateDto ToDto(UtilityRate rate) => new()
    {
        Category = rate.Category,
        Enabled = rate.Enabled,
        PricePerUnit = rate.PricePerUnit,
        MinimumCharge = rate.MinimumCharge
    };

    private static string UtilityName(ChargeCategory category) => category switch
    {
        ChargeCategory.Water => "Água",
        ChargeCategory.Electricity => "Luz",
        _ => "Gás"
    };

    private static string MeterUnit(ChargeCategory category) => category == ChargeCategory.Electricity ? "kWh" : "m³";

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

    private record Payer(int PersonId, string Name, int DueDay);
}
