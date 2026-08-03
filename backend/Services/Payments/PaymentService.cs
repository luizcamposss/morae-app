
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Payment;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Notifications;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Payments;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly INotificationService _notificationService;

    public PaymentService(
        AppDbContext context,
        IPermissionService permissionService,
        UserManager<ApplicationUser> userManager,
        IMapper mapper,
        INotificationService notificationService)
    {
        _context = context;
        _permissionService = permissionService;
        _userManager = userManager;
        _mapper = mapper;
        _notificationService = notificationService;
    }
    public async Task<PaymentResponseDto> CreateManualAsync(
        int userId,
        int chargeId,
        CreateManualPaymentDto dto)
    {
        var charge = await _context.Charges
            .FirstOrDefaultAsync(c => c.Id == chargeId);

        if (charge is null)
            throw new NotFoundException("Charge not found.");

        await EnsureCanRegisterPaymentAsync(userId, charge);

        if (charge.Status == ChargeStatus.Paid)
            throw new BadRequestException("Charge is already paid.");

        if (charge.Status == ChargeStatus.Canceled)
            throw new BadRequestException("Canceled charges cannot be paid.");

        if (dto.PaymentMethod == PaymentMethod.Undefined)
            throw new BadRequestException("Payment method is required.");

        if (dto.AmountPaid != charge.Value)
            throw new BadRequestException("Manual payment amount must match charge value.");

        var payment = _mapper.Map<Payment>(dto);

        payment.ChargeId = charge.Id;
        payment.RegisteredByUserId = userId;
        payment.Source = PaymentSource.Manual;
        payment.PaidAt = dto.PaidAt ?? DateTime.UtcNow;
        payment.CreatedAt = DateTime.UtcNow;

        _context.Payments.Add(payment);

        charge.Status = ChargeStatus.Paid;

        await _context.SaveChangesAsync();
        await CreatePaymentNotificationsAsync(charge);

        return _mapper.Map<PaymentResponseDto>(payment);
    }

    public async Task<IEnumerable<PaymentResponseDto>> GetByChargeAsync(int userId, int chargeId)
    {
        var charge = await _context.Charges
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == chargeId);

        if (charge is null)
            throw new NotFoundException("Charge not found.");

        await EnsureCanReadPaymentsAsync(userId, charge);

        var payments = await _context.Payments
            .AsNoTracking()
            .Where(p => p.ChargeId == chargeId)
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<PaymentResponseDto>>(payments);
    }

    private async Task EnsureCanRegisterPaymentAsync(int userId, Charge charge)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        if (charge.Scope == ChargeScope.Platform)
        {
            await _permissionService.EnsureMasterAsync(userId);

            if (!await IsMasterCondominiumOwnerAsync(userId, charge.CondominiumId))
                throw new ForbiddenException("Master can only register platform payments for condominiums created by them.");

            return;
        }

        if (charge.Scope == ChargeScope.Condominium)
        {
            if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
            {
                await _permissionService.EnsureCondominiumAdminAsync(userId, charge.CondominiumId);
                return;
            }

            if (await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
            {
                await _permissionService.EnsureCondominiumPermissionAsync(
                    userId,
                    charge.CondominiumId,
                    AppPermissions.ChargesMarkAsPaid);

                return;
            }

            throw new ForbiddenException("User cannot register this condominium payment.");
        }

        throw new BadRequestException("Invalid charge scope.");
    }

    private async Task EnsureCanReadPaymentsAsync(int userId, Charge charge)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        if (charge.Scope == ChargeScope.Platform)
        {
            if (await _userManager.IsInRoleAsync(user, AppRoles.Master) &&
                await IsMasterCondominiumOwnerAsync(userId, charge.CondominiumId))
            {
                return;
            }

            if (await _permissionService.IsCondominiumAdminAsync(userId, charge.CondominiumId))
                return;

            throw new ForbiddenException("User cannot access this payment.");
        }

        if (charge.Scope == ChargeScope.Condominium)
        {
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

            throw new ForbiddenException("User cannot access this payment.");
        }

        throw new BadRequestException("Invalid charge scope.");
    }

    private async Task<bool> IsMasterCondominiumOwnerAsync(int userId, int condominiumId)
    {
        return await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c =>
                c.Id == condominiumId &&
                c.CreatedByUserId == userId);
    }

    private async Task CreatePaymentNotificationsAsync(Charge charge)
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
                NotificationType.Payment,
                "Pagamento MORAÊ registrado",
                $"O pagamento institucional de {condominiumName} foi registrado.",
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
                NotificationType.Payment,
                "Pagamento registrado",
                "O pagamento de uma cobrança da sua unidade foi registrado.",
                "/resident/bills",
                charge.CondominiumId);
        }
    }
}
