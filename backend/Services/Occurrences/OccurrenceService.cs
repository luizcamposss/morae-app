using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Occurrence;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Notifications;
using backend.Services.Permissions;
using backend.Services.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Occurrences;

public class OccurrenceService : IOccurrenceService
{
    public const int MaxPhotos = 5;
    public const long MaxPhotoSizeBytes = 10 * 1024 * 1024;

    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly INotificationService _notificationService;
    private readonly IFileStorage _fileStorage;
    private readonly ILogger<OccurrenceService> _logger;

    public OccurrenceService(
        AppDbContext context,
        IMapper mapper,
        IPermissionService permissionService,
        UserManager<ApplicationUser> userManager,
        INotificationService notificationService,
        IFileStorage fileStorage,
        ILogger<OccurrenceService> logger)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
        _userManager = userManager;
        _notificationService = notificationService;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    public async Task<OccurrenceResponseDto> CreateAsync(
        int userId,
        CreateOccurrenceDto dto,
        IReadOnlyList<IFormFile>? photos = null)
    {
        var files = (photos ?? []).Where(file => file.Length > 0).ToList();

        if (files.Count > MaxPhotos)
            throw new BadRequestException($"Envie no máximo {MaxPhotos} fotos.");

        await ValidateCreateAsync(userId, dto);

        var occurrence = _mapper.Map<Occurrence>(dto);

        occurrence.CreatedByUserId = userId;
        occurrence.Status = OccurrenceStatus.Open;
        occurrence.CreatedAt = DateTime.UtcNow;

        try
        {
            foreach (var file in files)
                occurrence.Photos.Add(await SavePhotoAsync(file, dto.CondominiumId));

            _context.Occurrences.Add(occurrence);
            await _context.SaveChangesAsync();
        }
        catch
        {
            // Nothing was recorded: the files already saved would be orphans.
            foreach (var photo in occurrence.Photos)
                await DeleteFileQuietlyAsync(photo.StorageKey);
            throw;
        }

        return await GetResponseAsync(occurrence.Id);
    }

    public async Task<IEnumerable<OccurrenceResponseDto>> GetByCondominiumAsync(
        int userId,
        int condominiumId)
    {
        await EnsureCanManageCondominiumOccurrencesAsync(userId, condominiumId);

        var query = QueryWithDetails()
            .Where(o => o.CondominiumId == condominiumId);

        var managedBuildingIds = await _permissionService.GetManagedBuildingIdsAsync(userId, condominiumId);

        if (managedBuildingIds is not null)
        {
            query = query.Where(occurrence =>
                managedBuildingIds.Contains(occurrence.Unit.BuildingId));
        }

        var occurrences = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<OccurrenceResponseDto>>(occurrences);
    }

    public async Task<IEnumerable<OccurrenceResponseDto>> GetMineAsync(int userId)
    {
        var occurrences = await QueryWithDetails()
            .Where(o =>
                o.CreatedByUserId == userId &&
                o.Condominium.Status == Status.Active &&
                o.Condominium.EnabledModules.Contains(AppModules.Occurrences))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<OccurrenceResponseDto>>(occurrences);
    }

    public async Task<OccurrenceResponseDto?> GetByIdAsync(int userId, int id)
    {
        var occurrence = await QueryWithDetails()
            .FirstOrDefaultAsync(o => o.Id == id);

        if (occurrence is null)
            return null;

        await EnsureCanReadAsync(userId, occurrence);

        return _mapper.Map<OccurrenceResponseDto>(occurrence);
    }

    public async Task<bool> UpdateStatusAsync(int userId, int id, UpdateOccurrenceDto dto)
    {
        var occurrence = await _context.Occurrences
            .FirstOrDefaultAsync(o => o.Id == id);

        if (occurrence is null)
            return false;

        await EnsureCanManageOccurrenceAsync(userId, occurrence);

        if (dto.Status == OccurrenceStatus.Undefined)
            throw new BadRequestException("Status de ocorrência inválido.");

        occurrence.Status = dto.Status;
        occurrence.UpdatedAt = DateTime.UtcNow;

        if (dto.Status == OccurrenceStatus.Resolved)
            occurrence.ResolvedAt = DateTime.UtcNow;

        if (dto.Status != OccurrenceStatus.Resolved)
            occurrence.ResolvedAt = null;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<OccurrenceResponseDto> RespondAsync(int userId, int id, RespondOccurrenceDto dto)
    {
        var occurrence = await _context.Occurrences
            .FirstOrDefaultAsync(o => o.Id == id)
            ?? throw new NotFoundException("Ocorrência não encontrada.");

        await EnsureCanManageOccurrenceAsync(userId, occurrence);

        var message = dto.Message?.Trim() ?? string.Empty;

        if (message.Length == 0)
            throw new BadRequestException("Escreva a resposta.");

        if (message.Length > 2000)
            throw new BadRequestException("A resposta pode ter no máximo 2000 caracteres.");

        occurrence.ManagementResponse = message;
        occurrence.RespondedAt = DateTime.UtcNow;
        occurrence.RespondedByUserId = userId;
        occurrence.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (occurrence.CreatedByUserId != userId)
            await NotifyCreatorAsync(occurrence);

        return await GetResponseAsync(occurrence.Id);
    }

    public async Task<OccurrencePhotoDownload> DownloadPhotoAsync(int userId, int photoId)
    {
        var photo = await _context.OccurrencePhotos
            .AsNoTracking()
            .Include(item => item.Occurrence)
            .FirstOrDefaultAsync(item => item.Id == photoId)
            ?? throw new NotFoundException("Foto não encontrada.");

        await EnsureCanReadAsync(userId, photo.Occurrence);

        var content = await _fileStorage.OpenReadAsync(photo.StorageKey);

        if (content is null)
        {
            _logger.LogError("Photo {PhotoId} of an occurrence is missing from storage.", photoId);
            throw new NotFoundException("A foto não está disponível.");
        }

        return new OccurrencePhotoDownload(content, photo.ContentType, photo.FileName);
    }

    private IQueryable<Occurrence> QueryWithDetails()
    {
        return _context.Occurrences
            .AsNoTracking()
            .Include(o => o.Unit).ThenInclude(unit => unit.Building)
            .Include(o => o.CreatedByUser).ThenInclude(user => user.Person)
            .Include(o => o.RespondedByUser).ThenInclude(user => user!.Person)
            .Include(o => o.Photos)
            .AsSplitQuery();
    }

    private async Task<OccurrenceResponseDto> GetResponseAsync(int id)
    {
        var occurrence = await QueryWithDetails().FirstAsync(o => o.Id == id);

        return _mapper.Map<OccurrenceResponseDto>(occurrence);
    }

    // Only photos (JPG or PNG), checked by content like every other upload.
    private async Task<OccurrencePhoto> SavePhotoAsync(IFormFile file, int condominiumId)
    {
        if (file.Length > MaxPhotoSizeBytes)
            throw new BadRequestException("Cada foto pode ter no máximo 10 MB.");

        await using var content = file.OpenReadStream();

        var detected = UploadedFileInspector.Detect(content);

        if (detected is null || !detected.ContentType.StartsWith("image/", StringComparison.Ordinal))
            throw new BadRequestException("Envie fotos em JPG ou PNG.");

        var photo = new OccurrencePhoto
        {
            FileName = UploadedFileInspector.BuildFileName(file.FileName, detected, "foto"),
            ContentType = detected.ContentType,
            SizeBytes = file.Length,
            StorageKey = $"occurrences/{condominiumId}/{Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow
        };

        await _fileStorage.SaveAsync(photo.StorageKey, content);

        return photo;
    }

    private async Task DeleteFileQuietlyAsync(string key)
    {
        try
        {
            await _fileStorage.DeleteAsync(key);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not delete occurrence photo {StorageKey}.", key);
        }
    }

    private async Task NotifyCreatorAsync(Occurrence occurrence)
    {
        var role = await _context.UserCondominiums
            .AsNoTracking()
            .Where(link =>
                link.UserId == occurrence.CreatedByUserId &&
                link.CondominiumId == occurrence.CondominiumId)
            .Select(link => link.Role)
            .FirstOrDefaultAsync();

        // Each role has its own occurrences page.
        var link = role switch
        {
            AppRoles.Admin => "/admin/occurrences",
            AppRoles.Syndic => "/syndic/maintenance",
            _ => "/resident/occurrences"
        };

        await _notificationService.CreateAsync(
            occurrence.CreatedByUserId,
            NotificationType.Occurrence,
            "Resposta da gestão",
            $"A gestão respondeu à sua ocorrência \"{occurrence.Title}\".",
            link,
            occurrence.CondominiumId);
    }

    private async Task ValidateCreateAsync(int userId, CreateOccurrenceDto dto)
    {
        if (dto.Priority == OccurrencePriority.Undefined)
            throw new BadRequestException("Prioridade de ocorrência inválida.");

        if (dto.Type == OccurrenceType.Undefined)
            throw new BadRequestException("Tipo de ocorrência inválido.");

        var unit = await _context.Units
            .AsNoTracking()
            .Include(u => u.Building)
            .FirstOrDefaultAsync(u => u.Id == dto.UnitId);

        if (unit is null)
            throw new NotFoundException("Unidade não encontrada.");

        if (unit.Building.CondominiumId != dto.CondominiumId)
            throw new BadRequestException("Esta unidade não pertence a este condomínio.");

        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("Usuário não encontrado.");

        await _permissionService.EnsureModuleEnabledAsync(dto.CondominiumId, AppModules.Occurrences);

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
            throw new ForbiddenException("O Master não abre ocorrências.");

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAdminAsync(userId, dto.CondominiumId);
            return;
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
        {
            await _permissionService.EnsureCondominiumPermissionAsync(
                userId,
                dto.CondominiumId,
                AppPermissions.OccurrencesManage);

            await _permissionService.EnsureUnitAccessAsync(userId, dto.UnitId);

            return;
        }

        var userBelongsToUnit = await _context.PersonUnits
            .AsNoTracking()
            .AnyAsync(pu =>
                pu.PersonId == user.PersonId &&
                pu.UnitId == dto.UnitId);

        if (!userBelongsToUnit)
            throw new ForbiddenException("Você não pode abrir ocorrência para esta unidade.");
    }

    private async Task EnsureCanReadAsync(int userId, Occurrence occurrence)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("Usuário não encontrado.");

        await _permissionService.EnsureModuleEnabledAsync(occurrence.CondominiumId, AppModules.Occurrences);

        if (occurrence.CreatedByUserId == userId)
            return;

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAdminAsync(userId, occurrence.CondominiumId);
            return;
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
        {
            await _permissionService.EnsureCondominiumPermissionAsync(
                userId,
                occurrence.CondominiumId,
                AppPermissions.OccurrencesManage);

            await _permissionService.EnsureUnitAccessAsync(userId, occurrence.UnitId);
            return;
        }

        throw new ForbiddenException("Você não tem acesso a esta ocorrência.");
    }

    private async Task EnsureCanManageCondominiumOccurrencesAsync(int userId, int condominiumId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("Usuário não encontrado.");

        await _permissionService.EnsureModuleEnabledAsync(condominiumId, AppModules.Occurrences);

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);
            return;
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
        {
            await _permissionService.EnsureCondominiumPermissionAsync(
                userId,
                condominiumId,
                AppPermissions.OccurrencesManage);

            return;
        }

        throw new ForbiddenException("Você não tem permissão para gerenciar ocorrências.");
    }

    private async Task EnsureCanManageOccurrenceAsync(int userId, Occurrence occurrence)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("Usuário não encontrado.");

        await _permissionService.EnsureModuleEnabledAsync(occurrence.CondominiumId, AppModules.Occurrences);

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAdminAsync(userId, occurrence.CondominiumId);
            return;
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
        {
            await _permissionService.EnsureCondominiumPermissionAsync(
                userId,
                occurrence.CondominiumId,
                AppPermissions.OccurrencesManage);

            await _permissionService.EnsureUnitAccessAsync(userId, occurrence.UnitId);
            return;
        }

        throw new ForbiddenException("Você não tem permissão para gerenciar ocorrências.");
    }
}
