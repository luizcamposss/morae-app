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
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Occurrences;

public class OccurrenceService : IOccurrenceService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly UserManager<ApplicationUser> _userManager;

    public OccurrenceService(
        AppDbContext context,
        IMapper mapper,
        IPermissionService permissionService,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
        _userManager = userManager;
    }

    public async Task<OccurrenceResponseDto> CreateAsync(int userId, CreateOccurrenceDto dto)
    {
        await ValidateCreateAsync(userId, dto);

        var occurrence = _mapper.Map<Occurrence>(dto);

        occurrence.CreatedByUserId = userId;
        occurrence.Status = OccurrenceStatus.Open;
        occurrence.CreatedAt = DateTime.UtcNow;

        _context.Occurrences.Add(occurrence);
        await _context.SaveChangesAsync();

        return _mapper.Map<OccurrenceResponseDto>(occurrence);
    }

    public async Task<IEnumerable<OccurrenceResponseDto>> GetByCondominiumAsync(
        int userId,
        int condominiumId)
    {
        await EnsureCanManageCondominiumOccurrencesAsync(userId, condominiumId);

        var query = _context.Occurrences
            .AsNoTracking()
            .Where(o => o.CondominiumId == condominiumId)
            .AsQueryable();

        if (await _permissionService.IsSyndicAsync(userId))
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user is null)
                throw new NotFoundException("User not found.");

            var linkedBuildingIds = await _context.PersonUnits
                .AsNoTracking()
                .Where(personUnit =>
                    personUnit.PersonId == user.PersonId &&
                    personUnit.Unit.Building.CondominiumId == condominiumId)
                .Select(personUnit => personUnit.Unit.BuildingId)
                .Distinct()
                .ToListAsync();

            query = query.Where(occurrence =>
                linkedBuildingIds.Contains(occurrence.Unit.BuildingId));
        }

        var occurrences = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<OccurrenceResponseDto>>(occurrences);
    }

    public async Task<IEnumerable<OccurrenceResponseDto>> GetMineAsync(int userId)
    {
        var occurrences = await _context.Occurrences
            .AsNoTracking()
            .Where(o => o.CreatedByUserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<OccurrenceResponseDto>>(occurrences);
    }

    public async Task<OccurrenceResponseDto?> GetByIdAsync(int userId, int id)
    {
        var occurrence = await _context.Occurrences
            .AsNoTracking()
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
            throw new BadRequestException("Invalid occurrence status.");

        occurrence.Status = dto.Status;
        occurrence.UpdatedAt = DateTime.UtcNow;

        if (dto.Status == OccurrenceStatus.Resolved)
            occurrence.ResolvedAt = DateTime.UtcNow;

        if (dto.Status != OccurrenceStatus.Resolved)
            occurrence.ResolvedAt = null;

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task ValidateCreateAsync(int userId, CreateOccurrenceDto dto)
    {
        if (dto.Priority == OccurrencePriority.Undefined)
            throw new BadRequestException("Invalid occurrence priority.");

        if (dto.Type == OccurrenceType.Undefined)
            throw new BadRequestException("Invalid occurrence type.");

        var unit = await _context.Units
            .AsNoTracking()
            .Include(u => u.Building)
            .FirstOrDefaultAsync(u => u.Id == dto.UnitId);

        if (unit is null)
            throw new NotFoundException("Unit not found.");

        if (unit.Building.CondominiumId != dto.CondominiumId)
            throw new BadRequestException("Unit does not belong to this condominium.");

        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
            throw new ForbiddenException("Master cannot create occurrences.");

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
            throw new ForbiddenException("User cannot create occurrence for this unit.");
    }

    private async Task EnsureCanReadAsync(int userId, Occurrence occurrence)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

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

        throw new ForbiddenException("User cannot access this occurrence.");
    }

    private async Task EnsureCanManageCondominiumOccurrencesAsync(int userId, int condominiumId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

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

        throw new ForbiddenException("User cannot manage occurrences.");
    }

    private async Task EnsureCanManageOccurrenceAsync(int userId, Occurrence occurrence)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

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

        throw new ForbiddenException("User cannot manage occurrences.");
    }
}
