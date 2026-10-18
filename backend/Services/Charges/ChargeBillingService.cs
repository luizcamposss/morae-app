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
    private const int GenerateDaysBeforeDue = 10;

    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly IChargeService _chargeService;
    private readonly ILogger<ChargeBillingService> _logger;

    public ChargeBillingService(
        AppDbContext context,
        IMapper mapper,
        IPermissionService permissionService,
        IChargeService chargeService,
        ILogger<ChargeBillingService> logger)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
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

    public async Task<RecurringChargeResponseDto> CreateRecurringAsync(
        int userId,
        int condominiumId,
        CreateRecurringChargeDto dto)
    {
        await _chargeService.EnsureBatchTargetValidAsync(userId, condominiumId, dto.BuildingId, dto.UnitValues);

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

            return await _chargeService.GenerateForUnitsAsync(new ChargeGenerationRequest(
                recurring.CondominiumId,
                recurring.BuildingId,
                null,
                recurring.Value,
                recurring.UnitValues.ToDictionary(item => item.UnitId, item => item.Value),
                dueDate,
                recurring.Description,
                recurring.CreatedByUserId,
                recurring.Id,
                new DateOnly(month.Year, month.Month, 1)));
        }

        return null;
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
            MaxMonthlyInterestPercent = ChargeLateFees.MaxMonthlyInterestPercent
        };
    }
}
