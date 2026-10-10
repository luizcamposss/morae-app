using backend.Constants;
using backend.Data;
using backend.DTOs.Maintenance;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Maintenance;

// Preventive maintenance is a management tool: only Admins and syndics with
// "maintenance.manage" use it. A syndic limited to some buildings sees the plans of those
// buildings and the condominium-wide ones, and edits condominium-wide plans only if they
// manage every building.
public class MaintenancePlanService : IMaintenancePlanService
{
    public const int DueSoonDays = 30;
    private const int MaxIntervalMonths = 120;

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;

    public MaintenancePlanService(AppDbContext context, IPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<MaintenancePlanResponseDto> CreateAsync(int userId, int condominiumId, SaveMaintenancePlanDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.MaintenanceManage);

        await ValidateAsync(dto, condominiumId);
        await EnsureCanEditScopeAsync(userId, condominiumId, dto.BuildingId);

        var plan = new MaintenancePlan
        {
            CondominiumId = condominiumId,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        Apply(plan, dto);

        _context.MaintenancePlans.Add(plan);
        await _context.SaveChangesAsync();

        return await GetResponseAsync(plan.Id);
    }

    public async Task<IEnumerable<MaintenancePlanResponseDto>> GetByCondominiumAsync(
        int userId,
        int condominiumId,
        MaintenanceStatus? status,
        int? buildingId)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.MaintenanceManage);

        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        var plans = await _context.MaintenancePlans
            .AsNoTracking()
            .Where(plan =>
                plan.CondominiumId == condominiumId &&
                (buildingId == null || plan.BuildingId == buildingId) &&
                (managed == null || plan.BuildingId == null || managed.Contains(plan.BuildingId.Value)))
            .OrderBy(plan => plan.NextDueDate)
            .ThenBy(plan => plan.Name)
            .Select(plan => new { plan, BuildingName = plan.Building != null ? plan.Building.Name : null })
            .ToListAsync();

        var today = Today();

        return plans
            .Select(row => ToResponse(row.plan, row.BuildingName, today))
            .Where(response => status == null || response.Status == status)
            .ToList();
    }

    public async Task<MaintenancePlanResponseDto> GetByIdAsync(int userId, int planId)
    {
        var plan = await FindVisiblePlanAsync(userId, planId, tracking: false);
        return await GetResponseAsync(plan.Id);
    }

    public async Task<MaintenancePlanResponseDto> UpdateAsync(int userId, int planId, SaveMaintenancePlanDto dto)
    {
        var plan = await FindVisiblePlanAsync(userId, planId, tracking: true);

        await ValidateAsync(dto, plan.CondominiumId);
        // Both the current and the new scope must be editable (no moving a plan out of reach).
        await EnsureCanEditScopeAsync(userId, plan.CondominiumId, plan.BuildingId);
        await EnsureCanEditScopeAsync(userId, plan.CondominiumId, dto.BuildingId);

        Apply(plan, dto);
        await _context.SaveChangesAsync();

        return await GetResponseAsync(plan.Id);
    }

    public async Task DeleteAsync(int userId, int planId)
    {
        var plan = await FindVisiblePlanAsync(userId, planId, tracking: true);

        await EnsureCanEditScopeAsync(userId, plan.CondominiumId, plan.BuildingId);

        _context.MaintenancePlans.Remove(plan);
        await _context.SaveChangesAsync();
    }

    public static MaintenanceStatus GetStatus(DateOnly nextDueDate, DateOnly today)
    {
        if (nextDueDate < today)
            return MaintenanceStatus.Overdue;

        return nextDueDate <= today.AddDays(DueSoonDays)
            ? MaintenanceStatus.DueSoon
            : MaintenanceStatus.UpToDate;
    }

    public static DateOnly Today() => DateOnly.FromDateTime(AppTimeZone.Today);

    private async Task<MaintenancePlan> FindVisiblePlanAsync(int userId, int planId, bool tracking)
    {
        var query = tracking ? _context.MaintenancePlans : _context.MaintenancePlans.AsNoTracking();

        var plan = await query.FirstOrDefaultAsync(item => item.Id == planId)
            ?? throw new NotFoundException("Manutenção não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(userId, plan.CondominiumId, AppPermissions.MaintenanceManage);

        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, plan.CondominiumId);

        if (managed is not null && plan.BuildingId is not null && !managed.Contains(plan.BuildingId.Value))
            throw new NotFoundException("Manutenção não encontrada.");

        return plan;
    }

    private async Task EnsureCanEditScopeAsync(int userId, int condominiumId, int? buildingId)
    {
        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        if (managed is null)
            return;

        if (buildingId is null)
            throw new ForbiddenException("Só quem administra todos os prédios pode alterar manutenções do condomínio inteiro.");

        if (!managed.Contains(buildingId.Value))
            throw new ForbiddenException("Você não administra este prédio.");
    }

    private async Task ValidateAsync(SaveMaintenancePlanDto dto, int condominiumId)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new BadRequestException("Informe o nome da manutenção.");

        if (dto.Name.Trim().Length > 150)
            throw new BadRequestException("O nome pode ter no máximo 150 caracteres.");

        if (dto.Category == MaintenanceCategory.Undefined || !Enum.IsDefined(dto.Category))
            throw new BadRequestException("Escolha a categoria da manutenção.");

        if (dto.IntervalMonths < 1 || dto.IntervalMonths > MaxIntervalMonths)
            throw new BadRequestException("A frequência deve ser de 1 a 120 meses.");

        if (dto.NextDueDate is null)
            throw new BadRequestException("Informe a data da próxima manutenção.");

        if (dto.ProviderName?.Trim().Length > 150)
            throw new BadRequestException("O nome da empresa pode ter no máximo 150 caracteres.");

        var phoneDigits = OnlyDigits(dto.ProviderPhone);

        if (phoneDigits.Length > 0 && (phoneDigits.Length < 10 || phoneDigits.Length > 13))
            throw new BadRequestException("Informe o telefone da empresa com DDD.");

        if (dto.Notes?.Trim().Length > 1000)
            throw new BadRequestException("As observações podem ter no máximo 1000 caracteres.");

        if (dto.BuildingId is not null)
        {
            var belongs = await _context.Buildings
                .AsNoTracking()
                .AnyAsync(building => building.Id == dto.BuildingId && building.CondominiumId == condominiumId);

            if (!belongs)
                throw new BadRequestException("Este prédio não pertence ao condomínio.");
        }
    }

    private static void Apply(MaintenancePlan plan, SaveMaintenancePlanDto dto)
    {
        var phoneDigits = OnlyDigits(dto.ProviderPhone);

        plan.BuildingId = dto.BuildingId;
        plan.Name = dto.Name.Trim();
        plan.Category = dto.Category;
        plan.IntervalMonths = dto.IntervalMonths;
        plan.NextDueDate = dto.NextDueDate!.Value;
        plan.ProviderName = string.IsNullOrWhiteSpace(dto.ProviderName) ? null : dto.ProviderName.Trim();
        plan.ProviderPhone = phoneDigits.Length == 0 ? null : phoneDigits;
        plan.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        plan.UpdatedAt = DateTime.UtcNow;
    }

    private async Task<MaintenancePlanResponseDto> GetResponseAsync(int planId)
    {
        var row = await _context.MaintenancePlans
            .AsNoTracking()
            .Where(plan => plan.Id == planId)
            .Select(plan => new { plan, BuildingName = plan.Building != null ? plan.Building.Name : null })
            .FirstAsync();

        return ToResponse(row.plan, row.BuildingName, Today());
    }

    private static MaintenancePlanResponseDto ToResponse(MaintenancePlan plan, string? buildingName, DateOnly today)
    {
        return new MaintenancePlanResponseDto
        {
            Id = plan.Id,
            CondominiumId = plan.CondominiumId,
            BuildingId = plan.BuildingId,
            BuildingName = buildingName,
            Name = plan.Name,
            Category = plan.Category,
            IntervalMonths = plan.IntervalMonths,
            NextDueDate = plan.NextDueDate,
            Status = GetStatus(plan.NextDueDate, today),
            DaysUntilDue = plan.NextDueDate.DayNumber - today.DayNumber,
            ProviderName = plan.ProviderName,
            ProviderPhone = plan.ProviderPhone,
            Notes = plan.Notes,
            CreatedAt = plan.CreatedAt,
            UpdatedAt = plan.UpdatedAt
        };
    }

    private static string OnlyDigits(string? value)
    {
        return new string((value ?? string.Empty).Where(char.IsDigit).ToArray());
    }
}
