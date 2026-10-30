using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.News;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.News;

public class NewsService : INewsService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly UserManager<ApplicationUser> _userManager;

    public NewsService(AppDbContext context, IMapper mapper, IPermissionService permissionService, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
        _userManager = userManager;
    }

    public async Task<NewsResponseDto> CreateAsync(int userId, CreateNewsDto dto)
    {
        await ValidateCreateAccessAsync(userId, dto);

        var news = _mapper.Map<backend.Models.News>(dto);

        news.UserId = userId;
        news.CreatedAt = DateTime.UtcNow;

        _context.News.Add(news);
        await _context.SaveChangesAsync();

        var response = _mapper.Map<NewsResponseDto>(news);

        if (news.Scope == NewsScope.Condominium)
        {
            await SyncRecipientsAsync(news);
            await FillReadCountsAsync(userId, news.CondominiumId!.Value, [response]);
        }

        return response;
    }
    public async Task<IEnumerable<NewsResponseDto>> GetPlatformAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("Usuário não encontrado.");

        var isMaster = await _userManager.IsInRoleAsync(user, AppRoles.Master);
        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);

        if (!isMaster && !isAdmin)
            throw new ForbiddenException("Você não tem acesso aos avisos da plataforma.");

        var news = await _context.News
            .AsNoTracking()
            .Where(n => n.Scope == NewsScope.Platform)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<NewsResponseDto>>(news);
    }
    public async Task<IEnumerable<NewsResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        var reader = await GetReaderAsync(userId, condominiumId);

        var news = await _context.News
            .AsNoTracking()
            .Where(n =>
                n.Scope == NewsScope.Condominium &&
                n.CondominiumId == condominiumId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var response = _mapper.Map<List<NewsResponseDto>>(news.Where(reader.CanSee));

        if (reader.CanManage)
            await FillReadCountsAsync(userId, condominiumId, response);

        return response;
    }
    public async Task<NewsResponseDto?> GetByIdAsync(int userId, int id)
    {
        var news = await _context.News
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == id);

        if (news is null)
            return null;

        await EnsureCanReadAsync(userId, news);

        var response = _mapper.Map<NewsResponseDto>(news);

        if (news.Scope == NewsScope.Condominium &&
            await CanManageAsync(userId, news.CondominiumId!.Value))
            await FillReadCountsAsync(userId, news.CondominiumId.Value, [response]);

        return response;
    }

    // Idempotent: only the first opening is saved. Opening a notice the user was not sent
    // (e.g. moved in after it was published) changes nothing.
    public async Task MarkAsReadAsync(int userId, int id)
    {
        var news = await _context.News
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == id)
            ?? throw new NotFoundException("Aviso não encontrado.");

        await EnsureCanReadAsync(userId, news);

        var recipient = await _context.NewsRecipients
            .FirstOrDefaultAsync(item =>
                item.NewsId == id &&
                item.UserId == userId &&
                item.ReadAt == null);

        if (recipient is null)
            return;

        recipient.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<NewsUnreadRecipientDto>> GetUnreadAsync(int userId, int id)
    {
        var news = await _context.News
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == id)
            ?? throw new NotFoundException("Aviso não encontrado.");

        if (news.Scope != NewsScope.Condominium)
            throw new BadRequestException("Só avisos do condomínio têm leitura registrada.");

        var condominiumId = news.CondominiumId!.Value;

        await EnsureCanReadAsync(userId, news);

        if (!await CanManageAsync(userId, condominiumId))
            throw new ForbiddenException("Você não tem permissão para ver quem leu este aviso.");

        var managedBuildingIds = await GetManagedScopeAsync(userId, condominiumId);

        var unread = await _context.NewsRecipients
            .AsNoTracking()
            .Where(recipient => recipient.NewsId == id && recipient.ReadAt == null)
            .Select(recipient => new { recipient.User.PersonId, recipient.User.Person.Name })
            .ToListAsync();

        var personIds = unread.Select(item => item.PersonId).ToList();

        var units = await _context.PersonUnits
            .AsNoTracking()
            .Where(personUnit =>
                personIds.Contains(personUnit.PersonId) &&
                personUnit.Unit.Building.CondominiumId == condominiumId)
            .Select(personUnit => new
            {
                personUnit.PersonId,
                personUnit.Unit.BuildingId,
                BuildingName = personUnit.Unit.Building.Name,
                personUnit.Unit.Number
            })
            .ToListAsync();

        var result = new List<NewsUnreadRecipientDto>();

        foreach (var person in unread)
        {
            var personUnits = units
                .Where(unit => unit.PersonId == person.PersonId)
                .Where(unit => managedBuildingIds is null || managedBuildingIds.Contains(unit.BuildingId))
                .Select(unit => new { unit.BuildingName, unit.Number })
                .Distinct()
                .ToList();

            if (personUnits.Count > 0)
            {
                result.AddRange(personUnits.Select(unit => new NewsUnreadRecipientDto
                {
                    Name = person.Name,
                    BuildingName = unit.BuildingName,
                    UnitNumber = unit.Number
                }));
            }
            // People without a unit (e.g. management) are listed only to whoever manages every building.
            else if (managedBuildingIds is null)
            {
                result.Add(new NewsUnreadRecipientDto { Name = person.Name });
            }
        }

        return result
            .OrderBy(item => item.BuildingName is null)
            .ThenBy(item => item.BuildingName)
            .ThenBy(item => item.UnitNumber?.Length)
            .ThenBy(item => item.UnitNumber)
            .ThenBy(item => item.Name);
    }
    public async Task<bool> UpdateAsync(int userId, int id, UpdateNewsDto dto)
    {
        var news = await _context.News
            .FirstOrDefaultAsync(n => n.Id == id);

        if (news is null)
            return false;

        await EnsureCanEditAsync(userId, news);

        if (news.Scope == NewsScope.Platform && dto.BuildingId is not null)
            throw new BadRequestException("Aviso da plataforma não pode ter prédio.");

        if (news.Scope == NewsScope.Condominium && dto.BuildingId is not null)
            await EnsureBuildingBelongsToCondominiumAsync(dto.BuildingId.Value, news.CondominiumId!.Value);

        var audienceChanged =
            news.TargetAudience != dto.TargetAudience ||
            news.BuildingId != dto.BuildingId;

        _mapper.Map(dto, news);

        await _context.SaveChangesAsync();

        // A notice moved to another audience is sent to the new people; reads are kept.
        if (audienceChanged && news.Scope == NewsScope.Condominium)
            await SyncRecipientsAsync(news);

        return true;
    }
    public async Task<bool> DeleteAsync(int userId, int id)
    {
        var news = await _context.News
            .FirstOrDefaultAsync(n => n.Id == id);

        if (news is null)
            return false;

        await EnsureCanEditAsync(userId, news);

        _context.News.Remove(news);
        await _context.SaveChangesAsync();

        return true;
    }
    private async Task ValidateCreateAccessAsync(int userId, CreateNewsDto dto)
    {
        if (dto.Scope == NewsScope.Platform)
        {
            await _permissionService.EnsureMasterAsync(userId);

            if (dto.CondominiumId is not null)
                throw new BadRequestException("Aviso da plataforma não pode ter condomínio.");

            if (dto.BuildingId is not null)
                throw new BadRequestException("Aviso da plataforma não pode ter prédio.");

            if (dto.TargetAudience != NewsTargetAudience.Admins)
                throw new BadRequestException("Avisos da plataforma vão só para administradores.");

            return;
        }

        if (dto.Scope == NewsScope.Condominium)
        {
            if (dto.CondominiumId is null)
                throw new BadRequestException("Selecione o condomínio do aviso.");

            await _permissionService.EnsureCondominiumPermissionAsync(
                userId,
                dto.CondominiumId.Value,
                AppPermissions.NewsCreate);

            if (dto.BuildingId is not null)
                await EnsureBuildingBelongsToCondominiumAsync(dto.BuildingId.Value, dto.CondominiumId.Value);

            return;
        }

        throw new BadRequestException("Tipo de aviso inválido.");
    }
    private async Task EnsureCanReadAsync(int userId, backend.Models.News news)
    {
        if (news.Scope == NewsScope.Platform)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user is null)
                throw new NotFoundException("Usuário não encontrado.");

            if (await _userManager.IsInRoleAsync(user, AppRoles.Master) ||
                await _userManager.IsInRoleAsync(user, AppRoles.Admin))
                return;

            throw new ForbiddenException("Você não tem acesso aos avisos da plataforma.");
        }

        await _permissionService.EnsureCondominiumAccessAsync(
            userId,
            news.CondominiumId!.Value);

        var reader = await GetReaderAsync(userId, news.CondominiumId.Value);

        // Same answer as for a missing notice: does not reveal notices meant for others.
        if (!reader.CanSee(news))
            throw new NotFoundException("Aviso não encontrado.");
    }

    // Who reads a condominium notice: the audience (Everyone or the reader's role) and,
    // for a building notice, people who live in or manage that building.
    // Whoever can create/edit notices sees all of them, to manage them.
    private async Task<NewsReader> GetReaderAsync(int userId, int condominiumId)
    {
        var canManage =
            await _permissionService.IsMasterAsync(userId) ||
            await _permissionService.HasAnyCondominiumPermissionAsync(
                userId, condominiumId, [AppPermissions.NewsCreate, AppPermissions.NewsEdit]);

        if (canManage)
        {
            var managedBuildingIds = await GetManagedScopeAsync(userId, condominiumId);

            return new NewsReader(
                true,
                [],
                managedBuildingIds is null ? [] : new HashSet<int>(managedBuildingIds),
                managedBuildingIds is null);
        }

        var audiences = new HashSet<NewsTargetAudience> { NewsTargetAudience.Everyone };
        var role = await _permissionService.GetCondominiumRoleAsync(userId, condominiumId);

        if (role == AppRoles.Admin)
            audiences.Add(NewsTargetAudience.Admins);

        if (role == AppRoles.Syndic)
            audiences.Add(NewsTargetAudience.Syndics);

        var personId = await _context.Users
            .Where(user => user.Id == userId)
            .Select(user => user.PersonId)
            .FirstAsync();

        var homeBuildingIds = await _context.PersonUnits
            .AsNoTracking()
            .Where(personUnit =>
                personUnit.PersonId == personId &&
                personUnit.Unit.Building.CondominiumId == condominiumId)
            .Select(personUnit => personUnit.Unit.BuildingId)
            .Distinct()
            .ToListAsync();

        // Residents' notices also reach a syndic who lives in the condominium.
        if (role == AppRoles.Resident || homeBuildingIds.Count > 0)
            audiences.Add(NewsTargetAudience.Residents);

        var buildingIds = new HashSet<int>(homeBuildingIds);

        if (role == AppRoles.Syndic)
        {
            var managed = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

            if (managed is null)
            {
                // Manages all buildings.
                buildingIds.UnionWith(await _context.Buildings
                    .AsNoTracking()
                    .Where(building => building.CondominiumId == condominiumId)
                    .Select(building => building.Id)
                    .ToListAsync());
            }
            else
            {
                buildingIds.UnionWith(managed);
            }
        }

        return new NewsReader(false, audiences, buildingIds, false);
    }

    private record NewsReader(
        bool CanManage,
        HashSet<NewsTargetAudience> Audiences,
        HashSet<int> BuildingIds,
        bool AllBuildings)
    {
        public bool CanSee(backend.Models.News news)
        {
            // A syndic limited to some buildings manages only their notices (and the condominium-wide ones).
            if (CanManage)
                return AllBuildings || news.BuildingId is null || BuildingIds.Contains(news.BuildingId.Value);

            if (!Audiences.Contains(news.TargetAudience))
                return false;

            return news.BuildingId is null || BuildingIds.Contains(news.BuildingId.Value);
        }
    }

    private async Task<bool> CanManageAsync(int userId, int condominiumId)
    {
        return await _permissionService.IsMasterAsync(userId) ||
            await _permissionService.HasAnyCondominiumPermissionAsync(
                userId, condominiumId, [AppPermissions.NewsCreate, AppPermissions.NewsEdit]);
    }

    // Buildings whose people a manager can see (null = all of them).
    private async Task<IReadOnlyCollection<int>?> GetManagedScopeAsync(int userId, int condominiumId)
    {
        if (await _permissionService.IsMasterAsync(userId))
            return null;

        return await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);
    }

    // "X of Y notified · Z read". A syndic limited to some buildings only counts their people.
    private async Task FillReadCountsAsync(int userId, int condominiumId, IReadOnlyCollection<NewsResponseDto> items)
    {
        if (items.Count == 0)
            return;

        var newsIds = items.Select(item => item.Id).ToList();
        var managedBuildingIds = await GetManagedScopeAsync(userId, condominiumId);

        var query = _context.NewsRecipients
            .AsNoTracking()
            .Where(recipient => newsIds.Contains(recipient.NewsId));

        if (managedBuildingIds is not null)
        {
            query = query.Where(recipient => _context.PersonUnits.Any(personUnit =>
                personUnit.PersonId == recipient.User.PersonId &&
                managedBuildingIds.Contains(personUnit.Unit.BuildingId)));
        }

        var counts = await query
            .GroupBy(recipient => recipient.NewsId)
            .Select(group => new
            {
                NewsId = group.Key,
                Total = group.Count(),
                Read = group.Count(recipient => recipient.ReadAt != null)
            })
            .ToDictionaryAsync(count => count.NewsId);

        foreach (var item in items)
        {
            var count = counts.GetValueOrDefault(item.Id);
            item.RecipientCount = count?.Total ?? 0;
            item.ReadCount = count?.Read ?? 0;
        }
    }

    // The people a condominium notice is sent to, by the same rule readers see it
    // (audience and building), except its author. Saved at publication and when the
    // audience changes; whoever is no longer in the audience is removed.
    private async Task SyncRecipientsAsync(backend.Models.News news)
    {
        var condominiumId = news.CondominiumId!.Value;

        var links = await _context.UserCondominiums
            .AsNoTracking()
            .Where(link =>
                link.CondominiumId == condominiumId &&
                link.Status == UserCondominiumStatus.Active &&
                link.UserId != news.UserId)
            .Select(link => new
            {
                link.UserId,
                link.User.PersonId,
                link.Role,
                link.ManagesAllBuildings,
                BuildingIds = link.Buildings.Select(managed => managed.BuildingId).ToList()
            })
            .ToListAsync();

        var personIds = links.Select(link => link.PersonId).ToList();

        var homeBuildings = (await _context.PersonUnits
            .AsNoTracking()
            .Where(personUnit =>
                personIds.Contains(personUnit.PersonId) &&
                personUnit.Unit.Building.CondominiumId == condominiumId)
            .Select(personUnit => new { personUnit.PersonId, personUnit.Unit.BuildingId })
            .ToListAsync())
            .ToLookup(item => item.PersonId, item => item.BuildingId);

        var recipientIds = links
            .Where(link =>
            {
                var home = homeBuildings[link.PersonId].ToHashSet();

                var inAudience = news.TargetAudience switch
                {
                    NewsTargetAudience.Everyone => true,
                    NewsTargetAudience.Admins => link.Role == AppRoles.Admin,
                    NewsTargetAudience.Syndics => link.Role == AppRoles.Syndic,
                    NewsTargetAudience.Residents => link.Role == AppRoles.Resident || home.Count > 0,
                    _ => false
                };

                if (!inAudience)
                    return false;

                if (news.BuildingId is null)
                    return true;

                return home.Contains(news.BuildingId.Value) ||
                    (link.Role == AppRoles.Syndic &&
                     (link.ManagesAllBuildings || link.BuildingIds.Contains(news.BuildingId.Value)));
            })
            .Select(link => link.UserId)
            .ToHashSet();

        var existing = await _context.NewsRecipients
            .Where(recipient => recipient.NewsId == news.Id)
            .ToListAsync();

        _context.NewsRecipients.RemoveRange(existing.Where(recipient => !recipientIds.Contains(recipient.UserId)));

        var existingIds = existing.Select(recipient => recipient.UserId).ToHashSet();

        _context.NewsRecipients.AddRange(recipientIds
            .Where(recipientId => !existingIds.Contains(recipientId))
            .Select(recipientId => new NewsRecipient
            {
                NewsId = news.Id,
                UserId = recipientId,
                CreatedAt = DateTime.UtcNow
            }));

        await _context.SaveChangesAsync();
    }

    private async Task EnsureCanEditAsync(int userId, backend.Models.News news)
    {
        if (news.Scope == NewsScope.Platform)
        {
            await _permissionService.EnsureMasterAsync(userId);
            return;
        }

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            news.CondominiumId!.Value,
            AppPermissions.NewsEdit);
    }

    private async Task EnsureBuildingBelongsToCondominiumAsync(int buildingId, int condominiumId)
    {
        var belongsToCondominium = await _context.Buildings
            .AsNoTracking()
            .AnyAsync(b =>
                b.Id == buildingId &&
                b.CondominiumId == condominiumId);

        if (!belongsToCondominium)
            throw new BadRequestException("Este prédio não pertence a este condomínio.");
    }
}