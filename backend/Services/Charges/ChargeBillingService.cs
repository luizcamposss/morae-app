using backend.Services.Invoices;
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Charge;
using backend.DTOs.Condominium;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Charges;

// Condominium billing rules (due day, fine and interest) and recurring monthly charges.
public class ChargeBillingService : IChargeBillingService
{
    // Recurring charges are generated this many days before their due date.
    // A fixed monthly charge enters the month's bill this many days before it is due (#209),
    // before the bill goes out automatically (10 days before, by default).
    private const int GenerateDaysBeforeDue = 20;

    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly IChargeService _chargeService;
    private readonly IInvoiceService _invoiceService;
    private readonly ILogger<ChargeBillingService> _logger;

    public ChargeBillingService(
        AppDbContext context,
        IMapper mapper,
        IPermissionService permissionService,
        IChargeService chargeService,
        IInvoiceService invoiceService,
        ILogger<ChargeBillingService> logger)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
        _invoiceService = invoiceService;
        _chargeService = chargeService;
        _logger = logger;
    }

    public async Task<BillingSettingsDto> GetSettingsAsync(int userId, int condominiumId)
    {
        // Residents may see the rule too: it is printed on their overdue charges.
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        return MapSettings(await GetCondominiumOrThrowAsync(condominiumId));
    }

    public async Task<BillingSettingsDto> UpdateSettingsAsync(
        int userId,
        int condominiumId,
        UpdateBillingSettingsDto dto)
    {
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);

        if (dto.FinePercent < 0 || dto.FinePercent > ChargeLateFees.MaxFinePercent)
            throw new BadRequestException("A multa pode ser de no máximo 2% (Código Civil).");

        if (dto.MonthlyInterestPercent < 0 || dto.MonthlyInterestPercent > ChargeLateFees.MaxMonthlyInterestPercent)
            throw new BadRequestException("Os juros podem ser de no máximo 1% ao mês (Código Civil).");

        var condominium = await _context.Condominiums.FirstOrDefaultAsync(c => c.Id == condominiumId)
            ?? throw new NotFoundException("Condomínio não encontrado.");

        condominium.BillingDueDay = dto.BillingDueDay;
        condominium.LateFeeEnabled = dto.LateFeeEnabled;
        condominium.FinePercent = Math.Round(dto.FinePercent, 2);
        condominium.MonthlyInterestPercent = Math.Round(dto.MonthlyInterestPercent, 2);

        if (dto.OpeningBalance.HasValue)
        {
            if (Math.Abs(dto.OpeningBalance.Value) > 9_999_999_999m)
                throw new BadRequestException("Informe um saldo inicial válido.");

            condominium.OpeningBalance = Math.Round(dto.OpeningBalance.Value, 2);
            condominium.OpeningBalanceMonth = dto.OpeningBalanceMonth.HasValue
                ? new DateOnly(dto.OpeningBalanceMonth.Value.Year, dto.OpeningBalanceMonth.Value.Month, 1)
                : null;
        }

        if (dto.InvoiceAutoSend.HasValue)
        {
            condominium.InvoiceAutoSendDaysBefore = dto.InvoiceAutoSend.Value
                ? dto.InvoiceAutoSendDaysBefore ?? throw new BadRequestException("Informe quantos dias antes do vencimento as contas são enviadas.")
                : null;
        }

        condominium.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapSettings(condominium);
    }

    public async Task<IEnumerable<RecurringChargeResponseDto>> GetRecurringAsync(int userId, int condominiumId)
    {
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);

        if (role != AppRoles.Admin && role != AppRoles.Syndic)
            throw new ForbiddenException("Você não tem acesso às cobranças deste condomínio.");

        if (role == AppRoles.Syndic)
            await _permissionService.EnsureAnyCondominiumPermissionAsync(userId, condominiumId, AppPermissions.FinanceAccess);

        var query = BuildRecurringQuery().Where(r => r.CondominiumId == condominiumId);

        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        if (managedBuildingIds is not null)
            query = query.Where(r => r.BuildingId.HasValue && managedBuildingIds.Contains(r.BuildingId.Value));

        var recurring = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();

        return _mapper.Map<IEnumerable<RecurringChargeResponseDto>>(recurring);
    }

    public async Task<CondominiumFeeDto> GetFeeAsync(int userId, int condominiumId)
    {
        // Residents see it too: it is what their bill brings every month.
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        return await BuildFeeResponseAsync(condominiumId, await FindFeeAsync(condominiumId));
    }

    public async Task<CondominiumFeeDto> SaveFeeAsync(int userId, int condominiumId, SaveCondominiumFeeDto dto)
    {
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);

        var fee = await FindFeeAsync(condominiumId, tracked: true);

        if (!dto.Enabled)
        {
            if (fee is not null)
            {
                fee.Status = RecurringChargeStatus.Ended;
                fee.EndedAt = DateTime.UtcNow;
                fee.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return await BuildFeeResponseAsync(condominiumId, null);
        }

        if (dto.Amount <= 0)
            throw new BadRequestException("Informe o valor da taxa de condomínio.");

        var unitIds = dto.Exceptions.Select(item => item.UnitId).Distinct().ToList();

        if (unitIds.Count != dto.Exceptions.Count)
            throw new BadRequestException("Cada unidade aparece uma vez só nas exceções.");

        var validUnits = await _context.Units.CountAsync(unit => unitIds.Contains(unit.Id) && unit.Building.CondominiumId == condominiumId);

        if (validUnits != unitIds.Count)
            throw new BadRequestException("Uma das unidades não é deste condomínio.");

        await _chargeService.EnsureCondominiumPaymentMethodAsync(condominiumId);

        if (fee is null)
        {
            fee = new RecurringCharge
            {
                CondominiumId = condominiumId,
                Category = ChargeCategory.CondominiumFee,
                Description = "Taxa de condomínio",
                Status = RecurringChargeStatus.Active,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.RecurringCharges.Add(fee);
        }
        else
        {
            _context.RecurringChargeUnitValues.RemoveRange(fee.UnitValues);
            fee.UnitValues.Clear();
        }

        fee.Value = Math.Round(dto.Amount, 2);
        fee.UpdatedAt = DateTime.UtcNow;

        foreach (var exception in dto.Exceptions)
            fee.UnitValues.Add(new RecurringChargeUnitValue { UnitId = exception.UnitId, Value = Math.Round(exception.Amount, 2) });

        await _context.SaveChangesAsync();

        // The month already in the window gets it right away (a value change applies from the next month).
        await GenerateForRecurringAsync(fee.Id, AppTimeZone.Today);

        return await BuildFeeResponseAsync(condominiumId, await FindFeeAsync(condominiumId));
    }

    // The active fixed charge of the whole condominium with the fee category.
    private Task<RecurringCharge?> FindFeeAsync(int condominiumId, bool tracked = false)
    {
        IQueryable<RecurringCharge> query = _context.RecurringCharges.Include(r => r.UnitValues).ThenInclude(item => item.Unit).ThenInclude(unit => unit.Building);
        if (!tracked) query = query.AsNoTracking();

        return query
            .Where(r =>
                r.CondominiumId == condominiumId &&
                r.Category == ChargeCategory.CondominiumFee &&
                r.UnitId == null &&
                r.BuildingId == null &&
                r.Status != RecurringChargeStatus.Ended)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();
    }

    private async Task<CondominiumFeeDto> BuildFeeResponseAsync(int condominiumId, RecurringCharge? fee)
    {
        var dueDay = await _context.Condominiums.Where(c => c.Id == condominiumId).Select(c => c.BillingDueDay).FirstAsync();

        return new CondominiumFeeDto
        {
            Enabled = fee is { Status: RecurringChargeStatus.Active },
            Amount = fee?.Value ?? 0,
            DueDay = fee?.DueDay ?? dueDay,
            Exceptions = fee?.UnitValues
                .OrderBy(item => item.Unit.Building.Name)
                .ThenBy(item => item.Unit.Number)
                .Select(item => new CondominiumFeeExceptionDto { UnitId = item.UnitId, UnitLabel = $"{item.Unit.Building.Name} · {item.Unit.Number}", Amount = item.Value })
                .ToList() ?? []
        };
    }

    public async Task<RecurringChargeResponseDto> CreateRecurringAsync(
        int userId,
        int condominiumId,
        CreateRecurringChargeDto dto)
    {
        // A recurrence for one unit bills it alone, in the unit's building.
        if (dto.UnitId.HasValue)
        {
            var unitBuildingId = await _context.Units
                .AsNoTracking()
                .Where(u => u.Id == dto.UnitId.Value && u.Building.CondominiumId == condominiumId)
                .Select(u => (int?)u.BuildingId)
                .FirstOrDefaultAsync()
                ?? throw new BadRequestException("Esta unidade não pertence a este condomínio.");

            dto.BuildingId = unitBuildingId;
            dto.UnitValues = [];
            await _chargeService.EnsureBatchTargetValidAsync(userId, condominiumId, dto.BuildingId, dto.UnitValues, [dto.UnitId.Value]);
            await _chargeService.EnsureRecipientLinkedAsync(dto.RecipientPersonId, dto.UnitId.Value);
        }
        else
        {
            if (dto.RecipientPersonId.HasValue)
                throw new BadRequestException("Para cobrar de uma pessoa, escolha a unidade da cobrança recorrente.");

            await _chargeService.EnsureBatchTargetValidAsync(userId, condominiumId, dto.BuildingId, dto.UnitValues);
        }

        // A syndic limited to some buildings must pick one: "all buildings" would reach units
        // outside the ones they manage.
        if (!dto.BuildingId.HasValue &&
            await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId) is not null)
        {
            throw new BadRequestException("Escolha o prédio da cobrança recorrente.");
        }

        var recurring = new RecurringCharge
        {
            CondominiumId = condominiumId,
            BuildingId = dto.BuildingId,
            UnitId = dto.UnitId,
            RecipientPersonId = dto.UnitId.HasValue ? dto.RecipientPersonId : null,
            Category = dto.Category ?? ChargeCategory.CondominiumFee,
            Description = dto.Description.Trim(),
            Value = dto.Value,
            DueDay = dto.DueDay,
            Status = RecurringChargeStatus.Active,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UnitValues = dto.UnitValues
                .Select(item => new RecurringChargeUnitValue { UnitId = item.UnitId, Value = item.Value })
                .ToList()
        };

        _context.RecurringCharges.Add(recurring);
        await _context.SaveChangesAsync();

        // Inside the 10-day window the first month is generated right away.
        var generation = await GenerateForRecurringAsync(recurring.Id, AppTimeZone.Today);

        return await GetResponseOrThrowAsync(recurring.Id, generation);
    }

    public Task<RecurringChargeResponseDto> PauseRecurringAsync(int userId, int id) =>
        ChangeStatusAsync(userId, id, RecurringChargeStatus.Paused);

    public Task<RecurringChargeResponseDto> ResumeRecurringAsync(int userId, int id) =>
        ChangeStatusAsync(userId, id, RecurringChargeStatus.Active);

    public Task<RecurringChargeResponseDto> EndRecurringAsync(int userId, int id) =>
        ChangeStatusAsync(userId, id, RecurringChargeStatus.Ended);

    public async Task GenerateDueRecurringChargesAsync(CancellationToken cancellationToken)
    {
        var today = AppTimeZone.Today;

        var recurringIds = await _context.RecurringCharges
            .AsNoTracking()
            .Where(r => r.Status == RecurringChargeStatus.Active && r.Condominium.Status == Status.Active)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

        foreach (var id in recurringIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var result = await GenerateForRecurringAsync(id, today);

                if (result is not null && result.CreatedCount > 0)
                {
                    _logger.LogInformation(
                        "Recurring charge {RecurringChargeId}: created {Created} charge(s), skipped {Skipped} unit(s).",
                        id,
                        result.CreatedCount,
                        result.Skipped.Count);
                }
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                // One broken recurrence (e.g. payment method removed) must not stop the others.
                _logger.LogError(exception, "Recurring charge {RecurringChargeId} failed to generate.", id);
                _context.ChangeTracker.Clear();
            }
        }
    }

    // Generates the month whose due date falls within the next 10 days (never a past due date).
    // Returns null when no month is in the window or the recurrence is not active.
    private async Task<ChargeBatchResultDto?> GenerateForRecurringAsync(int id, DateTime today)
    {
        var recurring = await _context.RecurringCharges
            .AsNoTracking()
            .Include(r => r.Condominium)
            .Include(r => r.UnitValues)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (recurring is null ||
            recurring.Status != RecurringChargeStatus.Active ||
            recurring.Condominium.Status != Status.Active)
        {
            return null;
        }

        var dueDay = recurring.DueDay ?? recurring.Condominium.BillingDueDay;

        foreach (var month in new[] { today, today.AddMonths(1) })
        {
            var dueDate = ChargeLateFees.DueDateIn(month.Year, month.Month, dueDay);

            if (dueDate < today.Date || today.Date < dueDate.AddDays(-GenerateDaysBeforeDue))
                continue;

            return await AddToMonthlyBillsAsync(recurring, new DateOnly(month.Year, month.Month, 1), dueDate);
        }

        return null;
    }

    // A fixed monthly charge is an item of each unit's bill of the month (#209), never twice per month
    // (also not on top of a standalone charge it created before this change).
    private async Task<ChargeBatchResultDto> AddToMonthlyBillsAsync(RecurringCharge recurring, DateOnly month, DateTime dueDate)
    {
        var units = await _context.Units
            .AsNoTracking()
            .Where(unit =>
                unit.Building.CondominiumId == recurring.CondominiumId &&
                (recurring.UnitId == null || unit.Id == recurring.UnitId) &&
                (recurring.BuildingId == null || unit.BuildingId == recurring.BuildingId))
            .Select(unit => new
            {
                unit.Id,
                unit.Number,
                BuildingName = unit.Building.Name,
                HasPeople = _context.PersonUnits.Any(link => link.UnitId == unit.Id),
                AlreadyBilled =
                    _context.ChargeItems.Any(item => item.RecurringChargeId == recurring.Id && item.Charge.UnitId == unit.Id && item.Charge.ReferenceMonth == month) ||
                    _context.Charges.Any(charge => charge.RecurringChargeId == recurring.Id && charge.UnitId == unit.Id && charge.ReferenceMonth == month)
            })
            .ToListAsync();

        var values = recurring.UnitValues.ToDictionary(item => item.UnitId, item => item.Value);
        var result = new ChargeBatchResultDto { DueDate = dueDate };

        foreach (var unit in units.Where(unit => !unit.AlreadyBilled))
        {
            if (!unit.HasPeople)
            {
                result.Skipped.Add(new SkippedUnitDto { UnitId = unit.Id, UnitNumber = unit.Number, BuildingName = unit.BuildingName, Reason = "Ninguém vinculado à unidade." });
                continue;
            }

            var amount = values.GetValueOrDefault(unit.Id, recurring.Value);

            // An exception of 0 = the unit is exempt.
            if (amount <= 0)
                continue;

            await _invoiceService.AddItemToDraftAsync(new InvoiceItemRequest(
                recurring.CondominiumId,
                unit.Id,
                recurring.RecipientPersonId,
                month,
                recurring.Category,
                recurring.Description,
                amount,
                recurring.CreatedByUserId,
                RecurringChargeId: recurring.Id));

            result.CreatedCount++;
            result.TotalValue += amount;
        }

        return result;
    }

    private async Task<RecurringChargeResponseDto> ChangeStatusAsync(
        int userId,
        int id,
        RecurringChargeStatus status)
    {
        var recurring = await _context.RecurringCharges.FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new NotFoundException("Cobrança recorrente não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            recurring.CondominiumId,
            AppPermissions.ChargesCreate);

        if (recurring.BuildingId.HasValue)
            await _permissionService.EnsureBuildingAccessAsync(userId, recurring.BuildingId.Value);
        else if (await _permissionService.GetManagedBuildingIdsAsync(userId, recurring.CondominiumId) is not null)
            throw new ForbiddenException("Você não tem acesso a todos os prédios desta cobrança recorrente.");

        if (recurring.Status == RecurringChargeStatus.Ended)
            throw new BadRequestException("Esta cobrança recorrente já foi encerrada.");

        if (recurring.Status == status)
            throw new BadRequestException(status == RecurringChargeStatus.Paused
                ? "Esta cobrança recorrente já está pausada."
                : "Esta cobrança recorrente já está ativa.");

        recurring.Status = status;
        recurring.UpdatedAt = DateTime.UtcNow;

        if (status == RecurringChargeStatus.Ended)
            recurring.EndedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Resuming inside the window generates the current month right away (if not generated yet).
        var generation = status == RecurringChargeStatus.Active
            ? await GenerateForRecurringAsync(recurring.Id, AppTimeZone.Today)
            : null;

        return await GetResponseOrThrowAsync(recurring.Id, generation);
    }

    private IQueryable<RecurringCharge> BuildRecurringQuery()
    {
        return _context.RecurringCharges
            .AsNoTracking()
            .Include(r => r.Condominium)
            .Include(r => r.Building)
            .Include(r => r.Unit)
            .Include(r => r.RecipientPerson)
            .Include(r => r.UnitValues)
                .ThenInclude(v => v.Unit);
    }

    private async Task<RecurringChargeResponseDto> GetResponseOrThrowAsync(int id, ChargeBatchResultDto? generation)
    {
        var recurring = await BuildRecurringQuery().FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new NotFoundException("Cobrança recorrente não encontrada.");

        var response = _mapper.Map<RecurringChargeResponseDto>(recurring);
        response.Generation = generation;

        return response;
    }

    private async Task<Models.Condominium> GetCondominiumOrThrowAsync(int condominiumId)
    {
        return await _context.Condominiums
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == condominiumId)
            ?? throw new NotFoundException("Condomínio não encontrado.");
    }

    private static BillingSettingsDto MapSettings(Models.Condominium condominium)
    {
        return new BillingSettingsDto
        {
            CondominiumId = condominium.Id,
            BillingDueDay = condominium.BillingDueDay,
            LateFeeEnabled = condominium.LateFeeEnabled,
            FinePercent = condominium.FinePercent,
            MonthlyInterestPercent = condominium.MonthlyInterestPercent,
            MaxFinePercent = ChargeLateFees.MaxFinePercent,
            MaxMonthlyInterestPercent = ChargeLateFees.MaxMonthlyInterestPercent,
            OpeningBalance = condominium.OpeningBalance,
            OpeningBalanceMonth = condominium.OpeningBalanceMonth,
            InvoiceAutoSendDaysBefore = condominium.InvoiceAutoSendDaysBefore
        };
    }
}
