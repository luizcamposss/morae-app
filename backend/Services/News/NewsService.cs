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
            throw new NotFoundException("User not found.");

        var isMaster = await _userManager.IsInRoleAsync(user, AppRoles.Master);
        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);

        if (!isMaster && !isAdmin)
            throw new ForbiddenException("User cannot access platform news.");

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

        var news = await _context.News
            .AsNoTracking()
            .Where(n =>
                n.Scope == NewsScope.Condominium &&
                n.CondominiumId == condominiumId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<NewsResponseDto>>(news);
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
            throw new BadRequestException("Platform news cannot have a building.");

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
                throw new BadRequestException("Platform news cannot have a condominium.");

            if (dto.BuildingId is not null)
                throw new BadRequestException("Platform news cannot have a building.");

            if (dto.TargetAudience != NewsTargetAudience.Admins)
                throw new BadRequestException("Platform news must target admins for now.");

            return;
        }

        if (dto.Scope == NewsScope.Condominium)
        {
            if (dto.CondominiumId is null)
                throw new BadRequestException("Condominium news must have a condominium.");

            await _permissionService.EnsureCondominiumPermissionAsync(
                userId,
                dto.CondominiumId.Value,
                AppPermissions.NewsCreate);

            if (dto.BuildingId is not null)
                await EnsureBuildingBelongsToCondominiumAsync(dto.BuildingId.Value, dto.CondominiumId.Value);

            return;
        }

        throw new BadRequestException("Invalid news scope.");
    }
    private async Task EnsureCanReadAsync(int userId, backend.Models.News news)
    {
        if (news.Scope == NewsScope.Platform)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user is null)
                throw new NotFoundException("User not found.");

            if (await _userManager.IsInRoleAsync(user, AppRoles.Master) ||
                await _userManager.IsInRoleAsync(user, AppRoles.Admin))
                return;

            throw new ForbiddenException("User cannot access platform news.");
        }

        await _permissionService.EnsureCondominiumAccessAsync(
            userId,
            news.CondominiumId!.Value);
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
            throw new BadRequestException("Building does not belong to this condominium.");
    }
}