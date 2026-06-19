using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Charge;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Charges;

public class ChargeService : IChargeService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly UserManager<ApplicationUser> _userManager;

    public ChargeService(
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

    public async Task<ChargeResponseDto> CreateAsync(int userId, CreateChargeDto dto)
    {
        await ValidateCreateAsync(userId, dto);

        var charge = _mapper.Map<Charge>(dto);

        charge.CreatedByUserId = userId;
        charge.Status = ChargeStatus.Pending;
        charge.CreatedAt = DateTime.UtcNow;

        _context.Charges.Add(charge);
        await _context.SaveChangesAsync();

        return _mapper.Map<ChargeResponseDto>(charge);
    }
    public async Task<IEnumerable<ChargeResponseDto>> GetPlatformAsync(int userId)
    {
        var user = await GetUserOrThrowAsync(userId);

        IQueryable<Charge> query = _context.Charges
            .AsNoTracking()
            .Where(c => c.Scope == ChargeScope.Platform);

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
        {
            var charges = await query
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ChargeResponseDto>>(charges);
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            var charges = await query
                .Where(c => c.TargetUserId == userId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ChargeResponseDto>>(charges);
        }

        throw new ForbiddenException("User cannot access platform charges.");
    }
    public async Task<IEnumerable<ChargeResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        var charges = await _context.Charges
            .AsNoTracking()
            .Where(c =>
                c.Scope == ChargeScope.Condominium &&
                c.CondominiumId == condominiumId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<ChargeResponseDto>>(charges);
    }
    public async Task<IEnumerable<ChargeResponseDto>> GetMineAsync(int userId)
    {
        var user = await GetUserOrThrowAsync(userId);

        var unitIds = await _context.PersonUnits
            .AsNoTracking()
            .Where(pu => pu.PersonId == user.PersonId)
            .Select(pu => pu.UnitId)
            .Distinct()
            .ToListAsync();

        var charges = await _context.Charges
            .AsNoTracking()
            .Where(c =>
                c.Scope == ChargeScope.Condominium &&
                c.UnitId.HasValue &&
                unitIds.Contains(c.UnitId.Value))
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<ChargeResponseDto>>(charges);
    }
    public async Task<ChargeResponseDto?> GetByIdAsync(int userId, int id)
    {
        var charge = await _context.Charges
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (charge is null)
            return null;

        await EnsureCanReadAsync(userId, charge);

        return _mapper.Map<ChargeResponseDto>(charge);
    }
    public async Task<bool> CancelAsync(int userId, int id, CancelChargeDto dto)
    {
        var charge = await _context.Charges
            .FirstOrDefaultAsync(c => c.Id == id);

        if (charge is null)
            return false;

        await EnsureCanCancelAsync(userId, charge);

        if (charge.Status == ChargeStatus.Paid)
            throw new BadRequestException("Paid charges cannot be canceled.");

        if (charge.Status == ChargeStatus.Canceled)
            throw new BadRequestException("Charge is already canceled.");

        charge.Status = ChargeStatus.Canceled;
        charge.CanceledAt = DateTime.UtcNow;
        charge.CancelReason = dto.Reason;

        await _context.SaveChangesAsync();

        return true;
    }
    private async Task ValidateCreateAsync(int userId, CreateChargeDto dto)
    {
        if (dto.DueDate.Date < DateTime.UtcNow.Date)
            throw new BadRequestException("Due date cannot be in the past.");

        var condominiumExists = await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c => c.Id == dto.CondominiumId);

        if (!condominiumExists)
            throw new NotFoundException("Condominium not found.");

        if (dto.Scope == ChargeScope.Platform)
        {
            await ValidatePlatformChargeCreateAsync(userId, dto);
            return;
        }

        if (dto.Scope == ChargeScope.Condominium)
        {
            await ValidateCondominiumChargeCreateAsync(userId, dto);
            return;
        }

        throw new BadRequestException("Invalid charge scope.");
    }
    private async Task ValidatePlatformChargeCreateAsync(int userId, CreateChargeDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        if (dto.TargetUserId is null)
            throw new BadRequestException("Platform charge must have a target admin user.");

        if (dto.UnitId is not null)
            throw new BadRequestException("Platform charge cannot have a unit.");

        var targetUser = await _userManager.FindByIdAsync(dto.TargetUserId.Value.ToString());

        if (targetUser is null)
            throw new NotFoundException("Target user not found.");

        if (!await _userManager.IsInRoleAsync(targetUser, AppRoles.Admin))
            throw new BadRequestException("Platform charge target user must be an admin.");

        var isCondominiumAdmin = await _permissionService.IsCondominiumAdminAsync(
            dto.TargetUserId.Value,
            dto.CondominiumId);

        if (!isCondominiumAdmin)
            throw new BadRequestException("Target admin does not manage this condominium.");
    }

    private async Task ValidateCondominiumChargeCreateAsync(int userId, CreateChargeDto dto)
    {
        if (dto.TargetUserId is not null)
            throw new BadRequestException("Condominium charge cannot have a target user for now.");

        if (dto.UnitId is null)
            throw new BadRequestException("Condominium charge must have a unit.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            dto.CondominiumId,
            AppPermissions.ChargesCreate);

        var unitBelongsToCondominium = await _context.Units
            .AsNoTracking()
            .AnyAsync(u =>
                u.Id == dto.UnitId.Value &&
                u.Building.CondominiumId == dto.CondominiumId);

        if (!unitBelongsToCondominium)
            throw new BadRequestException("Unit does not belong to this condominium.");
    }

    private async Task EnsureCanReadAsync(int userId, Charge charge)
    {
        var user = await GetUserOrThrowAsync(userId);

        if (charge.Scope == ChargeScope.Platform)
        {
            if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
                return;

            if (charge.TargetUserId == userId)
                return;

            throw new ForbiddenException("User cannot access this platform charge.");
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin) ||
            await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
        {
            await _permissionService.EnsureCondominiumAccessAsync(userId, charge.CondominiumId);
            return;
        }

        var canReadAsResident = await _context.PersonUnits
            .AsNoTracking()
            .AnyAsync(pu =>
                pu.PersonId == user.PersonId &&
                charge.UnitId.HasValue &&
                pu.UnitId == charge.UnitId.Value);

        if (canReadAsResident)
            return;

        throw new ForbiddenException("User cannot access this charge.");
    }

    private async Task EnsureCanCancelAsync(int userId, Charge charge)
    {
        var user = await GetUserOrThrowAsync(userId);

        if (charge.Scope == ChargeScope.Platform)
        {
            await _permissionService.EnsureMasterAsync(userId);
            return;
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAdminAsync(userId, charge.CondominiumId);
            return;
        }

        throw new ForbiddenException("User cannot cancel this charge.");
    }
    private async Task<ApplicationUser> GetUserOrThrowAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        return user;
    }
}