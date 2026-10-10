using backend.Constants;
using backend.Data;
using backend.DTOs.Maintenance;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using backend.Services.Storage;
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
    private readonly IFileStorage _fileStorage;
    private readonly ILogger<MaintenancePlanService> _logger;

    public MaintenancePlanService(
        AppDbContext context,
        IPermissionService permissionService,
        IFileStorage fileStorage,
        ILogger<MaintenancePlanService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _fileStorage = fileStorage;
        _logger = logger;
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
            .Select(plan => new
            {
                plan,
                BuildingName = plan.Building != null ? plan.Building.Name : null,
                LastPerformedOn = _context.MaintenanceRecords
                    .Where(record => record.MaintenancePlanId == plan.Id)
                    .Max(record => (DateOnly?)record.PerformedOn)
            })
            .ToListAsync();

        var today = Today();

        return plans
            .Select(row => ToResponse(row.plan, row.BuildingName, row.LastPerformedOn, today))
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

        var attachmentKeys = await _context.MaintenanceRecords
            .Where(record => record.MaintenancePlanId == plan.Id && record.AttachmentStorageKey != null)
            .Select(record => record.AttachmentStorageKey!)
            .ToListAsync();

        // The history goes with the plan (cascade), and then its files.
        _context.MaintenancePlans.Remove(plan);
        await _context.SaveChangesAsync();

        foreach (var key in attachmentKeys)
            await DeleteFileQuietlyAsync(key);
    }

    public async Task<MaintenanceRecordResponseDto> CreateRecordAsync(
        int userId,
        int planId,
        CreateMaintenanceRecordDto dto)
    {
        var plan = await FindVisiblePlanAsync(userId, planId, tracking: true);
        await EnsureCanEditScopeAsync(userId, plan.CondominiumId, plan.BuildingId);

        var today = Today();

        if (dto.PerformedOn is null)
            throw new BadRequestException("Informe a data em que a manutenção foi feita.");

        if (dto.PerformedOn.Value > today)
            throw new BadRequestException("A data da execução não pode ser no futuro.");

        if (dto.ProviderName?.Trim().Length > 150)
            throw new BadRequestException("O nome da empresa pode ter no máximo 150 caracteres.");

        if (dto.Notes?.Trim().Length > 1000)
            throw new BadRequestException("As observações podem ter no máximo 1000 caracteres.");

        var record = new MaintenanceRecord
        {
            MaintenancePlanId = plan.Id,
            PerformedOn = dto.PerformedOn.Value,
            PreviousDueDate = plan.NextDueDate,
            // Defaults to the plan's provider, the usual case.
            ProviderName = string.IsNullOrWhiteSpace(dto.ProviderName) ? plan.ProviderName : dto.ProviderName.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            RegisteredByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        if (dto.File is not null && dto.File.Length > 0)
            await SaveAttachmentAsync(record, dto.File, plan.CondominiumId);

        // The next date counts from the most recent execution. Registering an older one
        // (filling in history) does not move it backwards.
        var latestPerformedOn = await _context.MaintenanceRecords
            .Where(item => item.MaintenancePlanId == plan.Id)
            .MaxAsync(item => (DateOnly?)item.PerformedOn);

        if (latestPerformedOn is null || record.PerformedOn >= latestPerformedOn)
            plan.NextDueDate = record.PerformedOn.AddMonths(plan.IntervalMonths);

        plan.UpdatedAt = DateTime.UtcNow;

        try
        {
            _context.MaintenanceRecords.Add(record);
            await _context.SaveChangesAsync();
        }
        catch
        {
            if (record.AttachmentStorageKey is not null)
                await DeleteFileQuietlyAsync(record.AttachmentStorageKey);
            throw;
        }

        return await GetRecordResponseAsync(record.Id);
    }

    public async Task<IEnumerable<MaintenanceRecordResponseDto>> GetRecordsAsync(int userId, int planId)
    {
        var plan = await FindVisiblePlanAsync(userId, planId, tracking: false);

        return await _context.MaintenanceRecords
            .AsNoTracking()
            .Where(record => record.MaintenancePlanId == plan.Id)
            .OrderByDescending(record => record.PerformedOn)
            .ThenByDescending(record => record.Id)
            .Select(ToRecordResponse())
            .ToListAsync();
    }

    public async Task<MaintenanceAttachmentDownload> DownloadAttachmentAsync(int userId, int recordId)
    {
        var record = await _context.MaintenanceRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == recordId)
            ?? throw new NotFoundException("Registro não encontrado.");

        await FindVisiblePlanAsync(userId, record.MaintenancePlanId, tracking: false);

        if (record.AttachmentStorageKey is null)
            throw new NotFoundException("Este registro não tem anexo.");

        var content = await _fileStorage.OpenReadAsync(record.AttachmentStorageKey);

        if (content is null)
        {
            _logger.LogError("Attachment of maintenance record {RecordId} is missing from storage.", recordId);
            throw new NotFoundException("O anexo não está disponível.");
        }

        return new MaintenanceAttachmentDownload(content, record.AttachmentContentType!, record.AttachmentFileName!);
    }

    // For a record registered by mistake.
    public async Task DeleteRecordAsync(int userId, int recordId)
    {
        var record = await _context.MaintenanceRecords
            .FirstOrDefaultAsync(item => item.Id == recordId)
            ?? throw new NotFoundException("Registro não encontrado.");

        var plan = await FindVisiblePlanAsync(userId, record.MaintenancePlanId, tracking: true);
        await EnsureCanEditScopeAsync(userId, plan.CondominiumId, plan.BuildingId);

        var latest = await _context.MaintenanceRecords
            .Where(item => item.MaintenancePlanId == plan.Id)
            .OrderByDescending(item => item.PerformedOn)
            .ThenByDescending(item => item.Id)
            .Select(item => item.Id)
            .FirstAsync();

        // Undoing the latest execution brings back the date that was due before it.
        if (latest == record.Id)
        {
            plan.NextDueDate = record.PreviousDueDate;
            plan.UpdatedAt = DateTime.UtcNow;
        }

        _context.MaintenanceRecords.Remove(record);
        await _context.SaveChangesAsync();

        if (record.AttachmentStorageKey is not null)
            await DeleteFileQuietlyAsync(record.AttachmentStorageKey);
    }

    private async Task SaveAttachmentAsync(MaintenanceRecord record, IFormFile file, int condominiumId)
    {
        if (file.Length > UploadedFileInspector.MaxFileSizeBytes)
            throw new BadRequestException("O anexo pode ter no máximo 20 MB.");

        await using var content = file.OpenReadStream();

        var detected = UploadedFileInspector.Detect(content)
            ?? throw new BadRequestException(UploadedFileInspector.AcceptedTypesMessage);

        record.AttachmentFileName = UploadedFileInspector.BuildFileName(file.FileName, detected, "anexo");
        record.AttachmentContentType = detected.ContentType;
        record.AttachmentSizeBytes = file.Length;
        record.AttachmentStorageKey = $"maintenance/{condominiumId}/{Guid.NewGuid():N}";

        await _fileStorage.SaveAsync(record.AttachmentStorageKey, content);
    }

    private async Task DeleteFileQuietlyAsync(string key)
    {
        try
        {
            await _fileStorage.DeleteAsync(key);
        }
        catch (Exception exception)
        {
            // The record is already gone for users; a leftover file only takes disk space.
            _logger.LogError(exception, "Could not delete maintenance attachment {StorageKey}.", key);
        }
    }

    private async Task<MaintenanceRecordResponseDto> GetRecordResponseAsync(int recordId)
    {
        return await _context.MaintenanceRecords
            .AsNoTracking()
            .Where(record => record.Id == recordId)
            .Select(ToRecordResponse())
            .FirstAsync();
    }

    private static System.Linq.Expressions.Expression<Func<MaintenanceRecord, MaintenanceRecordResponseDto>> ToRecordResponse()
    {
        return record => new MaintenanceRecordResponseDto
        {
            Id = record.Id,
            MaintenancePlanId = record.MaintenancePlanId,
            PerformedOn = record.PerformedOn,
            ProviderName = record.ProviderName,
            Notes = record.Notes,
            HasAttachment = record.AttachmentStorageKey != null,
            AttachmentFileName = record.AttachmentFileName,
            AttachmentSizeBytes = record.AttachmentSizeBytes,
            RegisteredByName = record.RegisteredByUser.Person.Name,
            CreatedAt = record.CreatedAt
        };
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
            .Select(plan => new
            {
                plan,
                BuildingName = plan.Building != null ? plan.Building.Name : null,
                LastPerformedOn = _context.MaintenanceRecords
                    .Where(record => record.MaintenancePlanId == plan.Id)
                    .Max(record => (DateOnly?)record.PerformedOn)
            })
            .FirstAsync();

        return ToResponse(row.plan, row.BuildingName, row.LastPerformedOn, Today());
    }

    private static MaintenancePlanResponseDto ToResponse(
        MaintenancePlan plan,
        string? buildingName,
        DateOnly? lastPerformedOn,
        DateOnly today)
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
            LastPerformedOn = lastPerformedOn,
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
