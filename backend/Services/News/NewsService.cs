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

        return _mapper.Map<NewsResponseDto>(news);
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

        return _mapper.Map<IEnumerable<NewsResponseDto>>(news.Where(reader.CanSee));
    }
    public async Task<NewsResponseDto?> GetByIdAsync(int userId, int id)
    {
        var news = await _context.News
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == id);

        if (news is null)
            return null;

        await EnsureCanReadAsync(userId, news);

        return _mapper.Map<NewsResponseDto>(news);
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

        _mapper.Map(dto, news);

        await _context.SaveChangesAsync();

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
            return new NewsReader(true, [], []);

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

        return new NewsReader(false, audiences, buildingIds);
    }

    private record NewsReader(bool CanManage, HashSet<NewsTargetAudience> Audiences, HashSet<int> BuildingIds)
    {
        public bool CanSee(backend.Models.News news)
        {
            if (CanManage)
                return true;

            if (!Audiences.Contains(news.TargetAudience))
                return false;

            return news.BuildingId is null || BuildingIds.Contains(news.BuildingId.Value);
        }
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