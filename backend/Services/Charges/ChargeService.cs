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
using backend.Services.Notifications;
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
    private readonly INotificationService _notificationService;

    public ChargeService(
        AppDbContext context,
        IMapper mapper,
        IPermissionService permissionService,
        UserManager<ApplicationUser> userManager,
        INotificationService notificationService)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
        _userManager = userManager;
        _notificationService = notificationService;
    }

    public async Task<ChargeResponseDto> CreateAsync(int userId, CreateChargeDto dto)
    {
        await ValidateCreateAsync(userId, dto);

        var charge = _mapper.Map<Charge>(dto);

        charge.CreatedByUserId = userId;
        charge.Status = ChargeStatus.Pending;
        charge.CreatedAt = DateTime.UtcNow;

        if (charge.Scope == ChargeScope.Platform)
        {
            charge.TargetUserId = null;
            charge.UnitId = null;
        }

        _context.Charges.Add(charge);
        await _context.SaveChangesAsync();
        await CreateChargeNotificationsAsync(charge);

        return await GetChargeResponseOrThrowAsync(charge.Id);
    }
    public async Task<IEnumerable<ChargeResponseDto>> GetPlatformAsync(int userId)
    {
        var user = await GetUserOrThrowAsync(userId);

        IQueryable<Charge> query = BuildChargeResponseQuery()
            .Where(c => c.Scope == ChargeScope.Platform);

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
        {
            var charges = await query
                .Where(c => c.Condominium.CreatedByUserId == userId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ChargeResponseDto>>(charges);
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            var charges = await query
                .Where(c => _context.UserCondominiums.Any(uc =>
                    uc.UserId == userId &&
                    uc.CondominiumId == c.CondominiumId &&
                    uc.Role == AppRoles.Admin &&
                    uc.Status == UserCondominiumStatus.Active))
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ChargeResponseDto>>(charges);
        }

        throw new ForbiddenException("User cannot access platform charges.");
    }
    public async Task<IEnumerable<ChargeResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        var user = await GetUserOrThrowAsync(userId);

        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);
        var isSyndic = await _userManager.IsInRoleAsync(user, AppRoles.Syndic);

        if (!isAdmin && !isSyndic)
            throw new ForbiddenException("User cannot access condominium charges.");

        await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId);

        var query = BuildChargeResponseQuery()
            .Where(c =>
                c.Scope == ChargeScope.Condominium &&
                c.CondominiumId == condominiumId);

        if (isSyndic)
        {
            var linkedBuildingIds = await _context.PersonUnits
                .AsNoTracking()
                .Where(personUnit =>
                    personUnit.PersonId == user.PersonId &&
                    personUnit.Unit.Building.CondominiumId == condominiumId)
                .Select(personUnit => personUnit.Unit.BuildingId)
                .Distinct()
                .ToListAsync();

            query = query.Where(charge =>
                charge.UnitId.HasValue &&
                linkedBuildingIds.Contains(charge.Unit!.BuildingId));
        }

        var charges = await query
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

        var charges = await BuildChargeResponseQuery()
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
        var charge = await BuildChargeResponseQuery()
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

        if (dto.UnitId is not null)
            throw new BadRequestException("Platform charge cannot have a unit.");

        var ownsCondominium = await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c =>
                c.Id == dto.CondominiumId &&
                c.CreatedByUserId == userId);

        if (!ownsCondominium)
            throw new ForbiddenException("Master can only create platform charges for condominiums created by them.");

        await EnsurePixKeyConfiguredAsync(FinancialAccountScope.Platform, null);
    }

    private async Task ValidateCondominiumChargeCreateAsync(int userId, CreateChargeDto dto)
    {
        if (await _permissionService.IsMasterAsync(userId))
            throw new ForbiddenException("Master cannot create condominium charges.");

        if (dto.TargetUserId is not null)
            throw new BadRequestException("Condominium charge cannot have a target user for now.");

        if (dto.UnitId is null)
            throw new BadRequestException("Condominium charge must have a unit.");

        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            dto.CondominiumId,
            AppPermissions.ChargesCreate);

        if (await _permissionService.IsSyndicAsync(userId))
            await _permissionService.EnsureUnitAccessAsync(userId, dto.UnitId.Value);

        var unitBelongsToCondominium = await _context.Units
            .AsNoTracking()
            .AnyAsync(u =>
                u.Id == dto.UnitId.Value &&
                u.Building.CondominiumId == dto.CondominiumId);

        if (!unitBelongsToCondominium)
            throw new BadRequestException("Unit does not belong to this condominium.");

        await EnsurePixKeyConfiguredAsync(FinancialAccountScope.Condominium, dto.CondominiumId);
    }

    private async Task EnsurePixKeyConfiguredAsync(
        FinancialAccountScope scope,
        int? condominiumId)
    {
        var hasPixKey = await _context.FinancialAccounts
            .AsNoTracking()
            .AnyAsync(account =>
                account.Scope == scope &&
                account.CondominiumId == condominiumId &&
                !string.IsNullOrWhiteSpace(account.PixKey));

        if (hasPixKey)
            return;

        var message = scope == FinancialAccountScope.Platform
            ? "Configure a chave Pix da plataforma antes de criar cobranças MORAÊ."
            : "Configure a chave Pix do condomínio antes de criar cobranças internas.";

        throw new BadRequestException(message);
    }

    private async Task EnsureCanReadAsync(int userId, Charge charge)
    {
        var user = await GetUserOrThrowAsync(userId);

        if (charge.Scope == ChargeScope.Platform)
        {
            if (await _userManager.IsInRoleAsync(user, AppRoles.Master) &&
                await IsMasterCondominiumOwnerAsync(userId, charge.CondominiumId))
            {
                return;
            }

            if (await _permissionService.IsCondominiumAdminAsync(userId, charge.CondominiumId))
                return;

            throw new ForbiddenException("User cannot access this platform charge.");
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAccessAsync(userId, charge.CondominiumId);
            return;
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
        {
            await _permissionService.EnsureCondominiumPermissionAsync(
                userId,
                charge.CondominiumId,
                AppPermissions.DelinquencyView);

            if (!charge.UnitId.HasValue)
                throw new ForbiddenException("User cannot access this charge.");

            await _permissionService.EnsureUnitAccessAsync(userId, charge.UnitId.Value);
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

            if (!await IsMasterCondominiumOwnerAsync(userId, charge.CondominiumId))
                throw new ForbiddenException("Master can only cancel platform charges from condominiums created by them.");

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

    private IQueryable<Charge> BuildChargeResponseQuery()
    {
        return _context.Charges
            .AsNoTracking()
            .Include(c => c.Condominium)
            .Include(c => c.Unit)
                .ThenInclude(u => u!.Building);
    }

    private async Task<ChargeResponseDto> GetChargeResponseOrThrowAsync(int id)
    {
        var charge = await BuildChargeResponseQuery()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (charge is null)
            throw new NotFoundException("Charge not found.");

        return _mapper.Map<ChargeResponseDto>(charge);
    }

    private async Task<bool> IsMasterCondominiumOwnerAsync(int userId, int condominiumId)
    {
        return await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c =>
                c.Id == condominiumId &&
                c.CreatedByUserId == userId);
    }

    private async Task CreateChargeNotificationsAsync(Charge charge)
    {
        var condominiumName = await _context.Condominiums
            .AsNoTracking()
            .Where(condominium => condominium.Id == charge.CondominiumId)
            .Select(condominium => condominium.Name)
            .FirstAsync();

        if (charge.Scope == ChargeScope.Platform)
        {
            var adminUserIds = await _context.UserCondominiums
                .AsNoTracking()
                .Where(userCondominium =>
                    userCondominium.CondominiumId == charge.CondominiumId &&
                    userCondominium.Role == AppRoles.Admin &&
                    userCondominium.Status == UserCondominiumStatus.Active)
                .Select(userCondominium => userCondominium.UserId)
                .Distinct()
                .ToListAsync();

            await _notificationService.CreateManyAsync(
                adminUserIds,
                NotificationType.Charge,
                "Nova cobrança MORAÊ",
                $"Há uma nova cobrança institucional para {condominiumName}.",
                "/admin/payments",
                charge.CondominiumId);

            return;
        }

        if (charge.Scope == ChargeScope.Condominium && charge.UnitId.HasValue)
        {
            var residentUserIds = await _context.PersonUnits
                .AsNoTracking()
                .Where(personUnit => personUnit.UnitId == charge.UnitId.Value)
                .Join(
                    _context.Users.AsNoTracking(),
                    personUnit => personUnit.PersonId,
                    user => user.PersonId,
                    (_, user) => user.Id)
                .Distinct()
                .ToListAsync();

            await _notificationService.CreateManyAsync(
                residentUserIds,
                NotificationType.Charge,
                "Novo boleto disponível",
                $"Uma cobrança de {charge.Value:C} foi gerada para sua unidade.",
                "/resident/bills",
                charge.CondominiumId);
        }
    }
}
