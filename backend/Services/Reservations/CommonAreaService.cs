using backend.Constants;
using backend.Data;
using backend.DTOs.Reservation;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Charges;
using backend.Services.Permissions;
using backend.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Reservations;

// Common areas and their booking rules. Managed by the Admin and by syndics with
// "reservations.manage" (areas of the whole condominium and of the buildings they manage);
// residents see the active areas their units can book.
public class CommonAreaService : ICommonAreaService
{
    public const long MaxPhotoSizeBytes = 10 * 1024 * 1024;
    private const int MaxShifts = 6;

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IChargeService _chargeService;
    private readonly IFileStorage _fileStorage;
    private readonly ILogger<CommonAreaService> _logger;

    public CommonAreaService(
        AppDbContext context,
        IPermissionService permissionService,
        IChargeService chargeService,
        IFileStorage fileStorage,
        ILogger<CommonAreaService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _chargeService = chargeService;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    public async Task<IEnumerable<CommonAreaResponseDto>> GetForManagementAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ReservationsManage);

        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);
        var today = ReservationRules.Today();

        var areas = await QueryResponses(_context.CommonAreas.Where(area =>
                area.CondominiumId == condominiumId &&
                (managed == null || area.BuildingId == null || managed.Contains(area.BuildingId.Value))),
                today, withPendingCount: true)
            .ToListAsync();

        return areas
            .OrderByDescending(area => area.IsActive)
            .ThenBy(area => area.Name)
            .ToList();
    }

    public async Task<IEnumerable<CommonAreaResponseDto>> GetBookableAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);
        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Reservations);

        var buildingIds = (await ReservationRules.GetUserUnitsAsync(_context, userId, condominiumId))
            .Select(unit => unit.BuildingId)
            .Distinct()
            .ToList();

        if (buildingIds.Count == 0)
            return [];

        var areas = await QueryResponses(_context.CommonAreas.Where(area =>
                area.CondominiumId == condominiumId &&
                area.IsActive &&
                (area.BuildingId == null || buildingIds.Contains(area.BuildingId.Value))),
                ReservationRules.Today(), withPendingCount: false)
            .ToListAsync();

        return areas.OrderBy(area => area.Name).ToList();
    }

    public async Task<CommonAreaResponseDto> CreateAsync(int userId, int condominiumId, SaveCommonAreaDto dto)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.ReservationsManage);
        await ValidateAsync(userId, condominiumId, dto);

        var area = new CommonArea
        {
            CondominiumId = condominiumId,
            CreatedAt = DateTime.UtcNow
        };

        Apply(area, dto);
        ApplyShifts(area, dto);

        _context.CommonAreas.Add(area);
        await _context.SaveChangesAsync();

        return await GetResponseAsync(area.Id);
    }

    public async Task<CommonAreaResponseDto> UpdateAsync(int userId, int areaId, SaveCommonAreaDto dto)
    {
        var area = await FindManagedAsync(userId, areaId, includeShifts: true);
        await ValidateAsync(userId, area.CondominiumId, dto);
        await EnsureScheduleChangeAllowedAsync(area, dto);

        Apply(area, dto);
        ApplyShifts(area, dto);
        await _context.SaveChangesAsync();

        return await GetResponseAsync(area.Id);
    }

    public async Task DeleteAsync(int userId, int areaId)
    {
        var area = await FindManagedAsync(userId, areaId, includeShifts: true);

        if (await _context.Reservations.AnyAsync(reservation => reservation.CommonAreaId == area.Id))
            throw new BadRequestException("Esta área já tem reservas no histórico. Desative-a para não receber novos pedidos.");

        var photoKey = area.PhotoStorageKey;

        _context.CommonAreas.Remove(area);
        await _context.SaveChangesAsync();

        if (photoKey is not null)
            await DeleteFileQuietlyAsync(photoKey);
    }

    public async Task<CommonAreaResponseDto> UploadPhotoAsync(int userId, int areaId, IFormFile? file)
    {
        var area = await FindManagedAsync(userId, areaId, includeShifts: false);

        if (file is null || file.Length == 0)
            throw new BadRequestException("Escolha uma foto.");

        if (file.Length > MaxPhotoSizeBytes)
            throw new BadRequestException("A foto pode ter no máximo 10 MB.");

        await using var content = file.OpenReadStream();
        var detected = UploadedFileInspector.Detect(content);

        if (detected is null || !detected.ContentType.StartsWith("image/", StringComparison.Ordinal))
            throw new BadRequestException("Envie a foto em JPG ou PNG.");

        var oldKey = area.PhotoStorageKey;
        var key = $"common-areas/{area.CondominiumId}/{Guid.NewGuid():N}";

        await _fileStorage.SaveAsync(key, content);

        area.PhotoStorageKey = key;
        area.PhotoContentType = detected.ContentType;
        area.PhotoFileName = UploadedFileInspector.BuildFileName(file.FileName, detected, "foto");
        area.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch
        {
            await DeleteFileQuietlyAsync(key);
            throw;
        }

        if (oldKey is not null)
            await DeleteFileQuietlyAsync(oldKey);

        return await GetResponseAsync(area.Id);
    }

    public async Task<CommonAreaResponseDto> DeletePhotoAsync(int userId, int areaId)
    {
        var area = await FindManagedAsync(userId, areaId, includeShifts: false);
        var oldKey = area.PhotoStorageKey;

        area.PhotoStorageKey = null;
        area.PhotoContentType = null;
        area.PhotoFileName = null;
        area.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (oldKey is not null)
            await DeleteFileQuietlyAsync(oldKey);

        return await GetResponseAsync(area.Id);
    }

    // Anyone in the condominium who can see the area (management or a unit that can book it).
    public async Task<CommonAreaPhotoDownload> DownloadPhotoAsync(int userId, int areaId)
    {
        var area = await _context.CommonAreas.AsNoTracking().FirstOrDefaultAsync(item => item.Id == areaId)
            ?? throw new NotFoundException("Área não encontrada.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, area.CondominiumId);

        await _permissionService.EnsureModuleEnabledAsync(area.CondominiumId, AppModules.Reservations);

        if (!await CanSeeAsync(userId, area))
            throw new NotFoundException("Área não encontrada.");

        if (area.PhotoStorageKey is null)
            throw new NotFoundException("Esta área não tem foto.");

        var content = await _fileStorage.OpenReadAsync(area.PhotoStorageKey);

        if (content is null)
        {
            _logger.LogError("Photo of common area {AreaId} is missing from storage.", areaId);
            throw new NotFoundException("A foto não foi encontrada.");
        }

        return new CommonAreaPhotoDownload(content, area.PhotoContentType ?? "image/jpeg", area.PhotoFileName ?? "foto.jpg");
    }

    private async Task<bool> CanSeeAsync(int userId, CommonArea area)
    {
        if (await _permissionService.HasCondominiumPermissionAsync(userId, area.CondominiumId, AppPermissions.ReservationsManage))
        {
            var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, area.CondominiumId);

            if (managed is null || area.BuildingId is null || managed.Contains(area.BuildingId.Value))
                return true;
        }

        var units = await ReservationRules.GetUserUnitsAsync(_context, userId, area.CondominiumId);

        return area.IsActive && units.Any(unit => area.BuildingId is null || unit.BuildingId == area.BuildingId);
    }

    private async Task<CommonArea> FindManagedAsync(int userId, int areaId, bool includeShifts)
    {
        var query = _context.CommonAreas.AsQueryable();

        if (includeShifts)
            query = query.Include(area => area.Shifts);

        var area = await query.FirstOrDefaultAsync(item => item.Id == areaId)
            ?? throw new NotFoundException("Área não encontrada.");

        await _permissionService.EnsureCondominiumPermissionAsync(userId, area.CondominiumId, AppPermissions.ReservationsManage);

        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, area.CondominiumId);

        if (managed is not null && area.BuildingId is not null && !managed.Contains(area.BuildingId.Value))
            throw new NotFoundException("Área não encontrada.");

        return area;
    }

    private async Task ValidateAsync(int userId, int condominiumId, SaveCommonAreaDto dto)
    {
        var name = dto.Name?.Trim() ?? string.Empty;

        if (name.Length < 2)
            throw new BadRequestException("Informe o nome da área.");

        if (name.Length > 100)
            throw new BadRequestException("O nome pode ter no máximo 100 caracteres.");

        if (dto.Description?.Trim().Length > 1000)
            throw new BadRequestException("A descrição pode ter no máximo 1.000 caracteres.");

        if (dto.Terms?.Trim().Length > 4000)
            throw new BadRequestException("Os termos de uso podem ter no máximo 4.000 caracteres.");

        if (dto.Capacity is < 1 or > 10000)
            throw new BadRequestException("A capacidade precisa ficar entre 1 e 10.000 pessoas.");

        if (dto.MinAdvanceDays is < 0 or > 365)
            throw new BadRequestException("A antecedência mínima precisa ficar entre 0 e 365 dias.");

        if (dto.MaxAdvanceDays is < 1 or > 730)
            throw new BadRequestException("A antecedência máxima precisa ficar entre 1 e 730 dias.");

        if (dto.MaxAdvanceDays < dto.MinAdvanceDays)
            throw new BadRequestException("A antecedência máxima precisa ser maior ou igual à mínima.");

        if (dto.MonthlyLimitPerUnit is < 1 or > 31)
            throw new BadRequestException("O limite por mês precisa ficar entre 1 e 31 reservas.");

        if (dto.FreeCancellationDays is < 0 or > 365)
            throw new BadRequestException("O prazo para cancelar sem custo precisa ficar entre 0 e 365 dias.");

        if (dto.Fee is < 0 or > 100000)
            throw new BadRequestException("A taxa precisa ficar entre R$ 0 e R$ 100.000.");

        if (dto.Fee is > 0 && decimal.Round(dto.Fee.Value, 2) != dto.Fee.Value)
            throw new BadRequestException("A taxa pode ter no máximo 2 casas decimais.");

        if (dto.BuildingId is not null)
        {
            var belongs = await _context.Buildings
                .AnyAsync(building => building.Id == dto.BuildingId && building.CondominiumId == condominiumId);

            if (!belongs)
                throw new BadRequestException("Este prédio não pertence ao condomínio.");

            var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

            if (managed is not null && !managed.Contains(dto.BuildingId.Value))
                throw new ForbiddenException("Você só cadastra áreas dos prédios que você cuida.");
        }

        if (!dto.FullDay)
            ValidateShifts(dto.Shifts);

        // The fee becomes a charge: the condominium needs a way to receive it.
        if (dto.Fee is > 0)
            await _chargeService.EnsureCondominiumPaymentMethodAsync(condominiumId);
    }

    private static void ValidateShifts(List<SaveCommonAreaShiftDto> shifts)
    {
        if (shifts.Count == 0)
            throw new BadRequestException("Cadastre pelo menos um turno, ou escolha reservar o dia inteiro.");

        if (shifts.Count > MaxShifts)
            throw new BadRequestException($"Cadastre no máximo {MaxShifts} turnos.");

        foreach (var shift in shifts)
        {
            var name = shift.Name?.Trim() ?? string.Empty;

            if (name.Length < 2 || name.Length > 60)
                throw new BadRequestException("Dê um nome de 2 a 60 caracteres para cada turno (ex.: Almoço, Noite).");

            if (shift.StartTime is null || shift.EndTime is null)
                throw new BadRequestException($"Informe o horário de início e de fim do turno \"{name}\".");

            if (shift.EndTime <= shift.StartTime)
                throw new BadRequestException($"No turno \"{name}\", o fim precisa ser depois do início.");
        }

        var ordered = shifts.OrderBy(shift => shift.StartTime).ToList();

        for (var index = 1; index < ordered.Count; index++)
        {
            if (ordered[index].StartTime < ordered[index - 1].EndTime)
                throw new BadRequestException($"Os turnos \"{ordered[index - 1].Name.Trim()}\" e \"{ordered[index].Name.Trim()}\" se sobrepõem.");
        }
    }

    // Changing how the area is booked, or removing a shift, must not strand reservations ahead.
    private async Task EnsureScheduleChangeAllowedAsync(CommonArea area, SaveCommonAreaDto dto)
    {
        var today = ReservationRules.Today();
        var keptShiftIds = dto.FullDay
            ? new HashSet<int>()
            : dto.Shifts.Where(shift => shift.Id is not null).Select(shift => shift.Id!.Value).ToHashSet();

        var upcoming = await _context.Reservations
            .AsNoTracking()
            .Where(reservation =>
                reservation.CommonAreaId == area.Id &&
                reservation.Date >= today &&
                (reservation.Status == ReservationStatus.Pending || reservation.Status == ReservationStatus.Approved))
            .Select(reservation => new { reservation.ShiftId, reservation.ShiftName })
            .ToListAsync();

        if (area.FullDay != dto.FullDay && upcoming.Count > 0)
            throw new BadRequestException("Há reservas futuras nesta área. Cancele-as antes de mudar entre turnos e dia inteiro.");

        var stranded = upcoming.FirstOrDefault(item => item.ShiftId is not null && !keptShiftIds.Contains(item.ShiftId.Value));

        if (!dto.FullDay && stranded is not null)
            throw new BadRequestException($"O turno \"{stranded.ShiftName}\" tem reservas futuras. Cancele-as antes de remover o turno.");

        var unknown = dto.Shifts.FirstOrDefault(shift =>
            shift.Id is not null && area.Shifts.All(existing => existing.Id != shift.Id || !existing.IsActive));

        if (!dto.FullDay && unknown is not null)
            throw new BadRequestException("Turno não encontrado. Recarregue a página e tente de novo.");
    }

    private static void Apply(CommonArea area, SaveCommonAreaDto dto)
    {
        area.Name = dto.Name.Trim();
        area.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        area.Capacity = dto.Capacity;
        area.BuildingId = dto.BuildingId;
        area.IsActive = dto.IsActive;
        area.FullDay = dto.FullDay;
        area.MinAdvanceDays = dto.MinAdvanceDays;
        area.MaxAdvanceDays = dto.MaxAdvanceDays;
        area.MonthlyLimitPerUnit = dto.MonthlyLimitPerUnit;
        area.RequiresApproval = dto.RequiresApproval;
        area.Fee = dto.Fee is > 0 ? dto.Fee : null;
        area.FreeCancellationDays = area.Fee is null ? null : dto.FreeCancellationDays;
        area.Terms = string.IsNullOrWhiteSpace(dto.Terms) ? null : dto.Terms.Trim();
        area.UpdatedAt = DateTime.UtcNow;
    }

    // Updates kept shifts, adds new ones and deactivates the removed ones (past reservations point to them).
    private static void ApplyShifts(CommonArea area, SaveCommonAreaDto dto)
    {
        var incoming = dto.FullDay ? [] : dto.Shifts.OrderBy(shift => shift.StartTime).ToList();
        var keptIds = incoming.Where(shift => shift.Id is not null).Select(shift => shift.Id!.Value).ToHashSet();

        foreach (var existing in area.Shifts.Where(shift => shift.IsActive && !keptIds.Contains(shift.Id)))
            existing.IsActive = false;

        for (var index = 0; index < incoming.Count; index++)
        {
            var source = incoming[index];
            var shift = source.Id is null ? null : area.Shifts.FirstOrDefault(item => item.Id == source.Id);

            if (shift is null)
            {
                shift = new CommonAreaShift();
                area.Shifts.Add(shift);
            }

            shift.Name = source.Name.Trim();
            shift.StartTime = source.StartTime!.Value;
            shift.EndTime = source.EndTime!.Value;
            shift.SortOrder = index;
            shift.IsActive = true;
        }
    }

    private async Task<CommonAreaResponseDto> GetResponseAsync(int areaId)
    {
        return await QueryResponses(_context.CommonAreas.Where(area => area.Id == areaId), ReservationRules.Today(), withPendingCount: true)
            .FirstAsync();
    }

    private IQueryable<CommonAreaResponseDto> QueryResponses(IQueryable<CommonArea> query, DateOnly today, bool withPendingCount)
    {
        return query
            .AsNoTracking()
            .Select(area => new CommonAreaResponseDto
            {
                Id = area.Id,
                CondominiumId = area.CondominiumId,
                BuildingId = area.BuildingId,
                BuildingName = area.Building != null ? area.Building.Name : null,
                Name = area.Name,
                Description = area.Description,
                Capacity = area.Capacity,
                IsActive = area.IsActive,
                FullDay = area.FullDay,
                Shifts = area.Shifts
                    .Where(shift => shift.IsActive)
                    .OrderBy(shift => shift.SortOrder)
                    .Select(shift => new CommonAreaShiftDto
                    {
                        Id = shift.Id,
                        Name = shift.Name,
                        StartTime = shift.StartTime,
                        EndTime = shift.EndTime
                    })
                    .ToList(),
                MinAdvanceDays = area.MinAdvanceDays,
                MaxAdvanceDays = area.MaxAdvanceDays,
                MonthlyLimitPerUnit = area.MonthlyLimitPerUnit,
                RequiresApproval = area.RequiresApproval,
                Fee = area.Fee,
                FreeCancellationDays = area.FreeCancellationDays,
                Terms = area.Terms,
                HasPhoto = area.PhotoStorageKey != null,
                PendingCount = withPendingCount
                    ? _context.Reservations.Count(reservation =>
                        reservation.CommonAreaId == area.Id &&
                        reservation.Status == ReservationStatus.Pending &&
                        reservation.Date >= today)
                    : 0
            });
    }

    private async Task DeleteFileQuietlyAsync(string key)
    {
        try
        {
            await _fileStorage.DeleteAsync(key);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not delete common area photo {StorageKey}.", key);
        }
    }
}
