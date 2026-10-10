using backend.Constants;
using backend.Data;
using backend.DTOs.Visit;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Visits;

// Expected visitors. Residents announce visits for their own units; the management (Admin, or
// syndic with "visitors.manage") sees the agenda of the buildings they manage and can also
// announce visits of the condominium itself (no unit).
public class VisitService : IVisitService
{
    private const int MaxPeriodDays = 366;
    private const int MaxAgendaDays = 31;

    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;

    public VisitService(AppDbContext context, IPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<VisitResponseDto> CreateAsync(int userId, int condominiumId, SaveVisitDto dto)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        var schedule = Validate(dto, isNew: true);
        await EnsureCanWriteAsync(userId, condominiumId, dto.UnitId);

        var visit = new ExpectedVisit
        {
            CondominiumId = condominiumId,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        Apply(visit, dto, schedule);

        _context.ExpectedVisits.Add(visit);
        await _context.SaveChangesAsync();

        return (await QueryResponses(_context.ExpectedVisits.Where(item => item.Id == visit.Id)).FirstAsync());
    }

    public async Task<IEnumerable<VisitResponseDto>> GetMineAsync(int userId, int condominiumId, bool includePast)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        var unitIds = await GetResidentUnitIdsAsync(userId, condominiumId);
        var today = Today();

        var query = _context.ExpectedVisits
            .Where(visit =>
                visit.CondominiumId == condominiumId &&
                // The whole household sees the unit's visits; managers also see the ones they created.
                ((visit.UnitId != null && unitIds.Contains(visit.UnitId.Value)) || visit.CreatedByUserId == userId) &&
                (includePast || (visit.EndDate >= today && visit.Status == VisitStatus.Active)));

        return (await QueryResponses(query).ToListAsync())
            .OrderBy(visit => visit.StartDate)
            .ThenBy(visit => visit.StartTime)
            .ToList();
    }

    public async Task<IEnumerable<VisitResponseDto>> GetAgendaAsync(
        int userId,
        int condominiumId,
        DateOnly? from,
        DateOnly? to,
        int? unitId,
        int? buildingId,
        VisitorType? visitorType,
        bool includeCanceled)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId, AppPermissions.VisitorsManage);

        var start = from ?? Today();
        var end = to ?? start;

        if (end < start)
            throw new BadRequestException("A data final precisa ser igual ou depois da inicial.");

        if (end.DayNumber - start.DayNumber + 1 > MaxAgendaDays)
            throw new BadRequestException("Consulte no máximo 31 dias por vez.");

        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        var query = _context.ExpectedVisits
            .Where(visit =>
                visit.CondominiumId == condominiumId &&
                visit.StartDate <= end &&
                visit.EndDate >= start &&
                (includeCanceled || visit.Status == VisitStatus.Active) &&
                (unitId == null || visit.UnitId == unitId) &&
                (buildingId == null || (visit.Unit != null && visit.Unit.BuildingId == buildingId)) &&
                (visitorType == null || visit.VisitorType == visitorType) &&
                (managed == null || visit.UnitId == null || managed.Contains(visit.Unit!.BuildingId)));

        var visits = await QueryResponses(query).ToListAsync();

        foreach (var visit in visits)
            visit.Dates = GetDates(visit.StartDate, visit.EndDate, ToMask(visit.DaysOfWeek), start, end);

        return visits
            .Where(visit => visit.Dates!.Count > 0)
            .OrderBy(visit => visit.Dates![0])
            .ThenBy(visit => visit.StartTime)
            .ThenBy(visit => visit.VisitorName)
            .ToList();
    }

    public async Task<VisitResponseDto> UpdateAsync(int userId, int visitId, SaveVisitDto dto)
    {
        var visit = await FindWritableAsync(userId, visitId);

        var schedule = Validate(dto, isNew: false);
        // The visit may move to another unit only if the user can write there too.
        await EnsureCanWriteAsync(userId, visit.CondominiumId, dto.UnitId);

        Apply(visit, dto, schedule);
        await _context.SaveChangesAsync();

        return await QueryResponses(_context.ExpectedVisits.Where(item => item.Id == visit.Id)).FirstAsync();
    }

    public async Task<VisitResponseDto> CancelAsync(int userId, int visitId)
    {
        var visit = await FindWritableAsync(userId, visitId);

        visit.Status = VisitStatus.Canceled;
        visit.CanceledAt = DateTime.UtcNow;
        visit.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await QueryResponses(_context.ExpectedVisits.Where(item => item.Id == visit.Id)).FirstAsync();
    }

    private async Task<ExpectedVisit> FindWritableAsync(int userId, int visitId)
    {
        var visit = await _context.ExpectedVisits.FirstOrDefaultAsync(item => item.Id == visitId)
            ?? throw new NotFoundException("Visita não encontrada.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, visit.CondominiumId);

        if (!await CanWriteAsync(userId, visit.CondominiumId, visit.UnitId))
            throw new NotFoundException("Visita não encontrada.");

        if (visit.Status == VisitStatus.Canceled)
            throw new BadRequestException("Esta visita foi cancelada.");

        if (visit.EndDate < Today())
            throw new BadRequestException("Esta visita já passou e não pode ser alterada.");

        return visit;
    }

    private async Task EnsureCanWriteAsync(int userId, int condominiumId, int? unitId)
    {
        if (unitId is not null)
        {
            var belongs = await _context.Units
                .AnyAsync(unit => unit.Id == unitId && unit.Building.CondominiumId == condominiumId);

            if (!belongs)
                throw new BadRequestException("Esta unidade não pertence ao condomínio.");
        }

        if (!await CanWriteAsync(userId, condominiumId, unitId))
        {
            throw new ForbiddenException(unitId is null
                ? "Só a administração cadastra visitas do condomínio."
                : "Você só pode cadastrar visitas para a sua unidade.");
        }
    }

    // Residents write for their own units; managers for the condominium and the units of the
    // buildings they manage.
    private async Task<bool> CanWriteAsync(int userId, int condominiumId, int? unitId)
    {
        if (unitId is not null && (await GetResidentUnitIdsAsync(userId, condominiumId)).Contains(unitId.Value))
            return true;

        if (!await _permissionService.HasCondominiumPermissionAsync(userId, condominiumId, AppPermissions.VisitorsManage))
            return false;

        if (unitId is null)
            return true;

        var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        if (managed is null)
            return true;

        var buildingId = await _context.Units
            .Where(unit => unit.Id == unitId)
            .Select(unit => unit.BuildingId)
            .FirstAsync();

        return managed.Contains(buildingId);
    }

    private async Task<List<int>> GetResidentUnitIdsAsync(int userId, int condominiumId)
    {
        return await _context.Users
            .Where(user => user.Id == userId)
            .SelectMany(user => _context.PersonUnits.Where(personUnit => personUnit.PersonId == user.PersonId))
            .Where(personUnit => personUnit.Unit.Building.CondominiumId == condominiumId)
            .Select(personUnit => personUnit.UnitId)
            .Distinct()
            .ToListAsync();
    }

    private record Schedule(DateOnly StartDate, DateOnly EndDate, int Mask);

    private static Schedule Validate(SaveVisitDto dto, bool isNew)
    {
        var name = dto.VisitorName?.Trim() ?? string.Empty;

        if (name.Length < 2)
            throw new BadRequestException("Informe o nome do visitante.");

        if (name.Length > 100)
            throw new BadRequestException("O nome pode ter no máximo 100 caracteres.");

        if (dto.VisitorType == VisitorType.Undefined || !Enum.IsDefined(dto.VisitorType))
            throw new BadRequestException("Escolha o tipo de visitante.");

        var document = dto.DocumentLastDigits?.Trim();

        if (!string.IsNullOrEmpty(document) && (document.Length != 4 || !document.All(char.IsLetterOrDigit)))
            throw new BadRequestException("Informe só os 4 últimos dígitos do documento.");

        if (dto.CompanyName?.Trim().Length > 100)
            throw new BadRequestException("O nome da empresa pode ter no máximo 100 caracteres.");

        if (dto.Notes?.Trim().Length > 500)
            throw new BadRequestException("As observações podem ter no máximo 500 caracteres.");

        if (dto.StartDate is null)
            throw new BadRequestException("Informe a data da visita.");

        var startDate = dto.StartDate.Value;
        var endDate = dto.EndDate ?? startDate;

        if (isNew && startDate < Today())
            throw new BadRequestException("A data da visita não pode ser no passado.");

        if (endDate < startDate)
            throw new BadRequestException("A data final precisa ser igual ou depois da inicial.");

        if (endDate.DayNumber - startDate.DayNumber + 1 > MaxPeriodDays)
            throw new BadRequestException("O período pode ter no máximo 1 ano. Depois, cadastre de novo.");

        if (dto.DaysOfWeek.Any(day => day is < 0 or > 6))
            throw new BadRequestException("Dia da semana inválido.");

        var mask = ToMask(dto.DaysOfWeek);

        if (GetDates(startDate, endDate, mask, startDate, endDate.DayNumber - startDate.DayNumber > 6 ? startDate.AddDays(6) : endDate).Count == 0)
            throw new BadRequestException("Nenhum dos dias da semana escolhidos cai dentro do período.");

        if (dto.StartTime.HasValue != dto.EndTime.HasValue)
            throw new BadRequestException("Informe o horário de início e de fim, ou nenhum dos dois.");

        if (dto.StartTime.HasValue && dto.EndTime <= dto.StartTime)
            throw new BadRequestException("O horário de fim precisa ser depois do de início.");

        return new Schedule(startDate, endDate, mask);
    }

    private static void Apply(ExpectedVisit visit, SaveVisitDto dto, Schedule schedule)
    {
        visit.UnitId = dto.UnitId;
        visit.VisitorName = dto.VisitorName.Trim();
        visit.VisitorType = dto.VisitorType;
        visit.DocumentLastDigits = string.IsNullOrWhiteSpace(dto.DocumentLastDigits) ? null : dto.DocumentLastDigits.Trim().ToUpperInvariant();
        visit.CompanyName = string.IsNullOrWhiteSpace(dto.CompanyName) ? null : dto.CompanyName.Trim();
        visit.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        visit.StartDate = schedule.StartDate;
        visit.EndDate = schedule.EndDate;
        visit.DaysOfWeekMask = schedule.Mask;
        visit.StartTime = dto.StartTime;
        visit.EndTime = dto.EndTime;
        visit.UpdatedAt = DateTime.UtcNow;
    }

    // The days between from and to (inclusive) on which the visit happens.
    private static List<DateOnly> GetDates(DateOnly startDate, DateOnly endDate, int mask, DateOnly from, DateOnly to)
    {
        var dates = new List<DateOnly>();
        var first = startDate > from ? startDate : from;
        var last = endDate < to ? endDate : to;

        for (var day = first; day <= last; day = day.AddDays(1))
        {
            if (mask == 0 || (mask & (1 << (int)day.DayOfWeek)) != 0)
                dates.Add(day);
        }

        return dates;
    }

    private static int ToMask(IEnumerable<int> days) => days.Distinct().Aggregate(0, (mask, day) => mask | (1 << day));

    private static List<int> FromMask(int mask) => Enumerable.Range(0, 7).Where(day => (mask & (1 << day)) != 0).ToList();

    private static DateOnly Today() => DateOnly.FromDateTime(AppTimeZone.Today);

    private static IQueryable<VisitResponseDto> QueryResponses(IQueryable<ExpectedVisit> query)
    {
        return query
            .AsNoTracking()
            .Select(visit => new
            {
                visit,
                UnitNumber = visit.Unit != null ? visit.Unit.Number : null,
                BuildingName = visit.Unit != null ? visit.Unit.Building.Name : null,
                BuildingId = visit.Unit != null ? (int?)visit.Unit.BuildingId : null,
                CreatedByName = visit.CreatedByUser.Person.Name
            })
            .Select(row => new VisitResponseDto
            {
                Id = row.visit.Id,
                CondominiumId = row.visit.CondominiumId,
                UnitId = row.visit.UnitId,
                UnitLabel = row.UnitNumber == null ? null : row.BuildingName + ", unidade " + row.UnitNumber,
                BuildingId = row.BuildingId,
                VisitorName = row.visit.VisitorName,
                VisitorType = row.visit.VisitorType,
                DocumentLastDigits = row.visit.DocumentLastDigits,
                CompanyName = row.visit.CompanyName,
                Notes = row.visit.Notes,
                StartDate = row.visit.StartDate,
                EndDate = row.visit.EndDate,
                DaysOfWeek = FromMask(row.visit.DaysOfWeekMask),
                StartTime = row.visit.StartTime,
                EndTime = row.visit.EndTime,
                Status = row.visit.Status,
                CreatedByName = row.CreatedByName,
                CreatedAt = row.visit.CreatedAt
            });
    }
}
