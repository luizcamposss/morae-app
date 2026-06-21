using backend.Constants;
using backend.Data;
using backend.DTOs.Delinquency;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Delinquency;

public class DelinquencyService : IDelinquencyService
{
    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly UserManager<ApplicationUser> _userManager;

    public DelinquencyService(
        AppDbContext context,
        IPermissionService permissionService,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _permissionService = permissionService;
        _userManager = userManager;
    }

    public async Task<IEnumerable<DelinquencyResponseDto>> GetPlatformAsync(int userId)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var today = DateTime.UtcNow.Date;

        var charges = await _context.Charges
            .AsNoTracking()
            .Where(c =>
                c.Scope == ChargeScope.Platform &&
                c.DueDate.Date < today &&
                (c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.Overdue))
            .OrderBy(c => c.DueDate)
            .ToListAsync();

        return charges.Select(charge => MapResponse(charge, today));
    }

    public async Task<IEnumerable<DelinquencyResponseDto>> GetByCondominiumAsync(
        int userId,
        int condominiumId)
    {
        await EnsureCanViewCondominiumDelinquencyAsync(userId, condominiumId);

        var today = DateTime.UtcNow.Date;

        var charges = await _context.Charges
            .AsNoTracking()
            .Where(c =>
                c.Scope == ChargeScope.Condominium &&
                c.CondominiumId == condominiumId &&
                c.DueDate.Date < today &&
                (c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.Overdue))
            .OrderBy(c => c.DueDate)
            .ToListAsync();

        return charges.Select(charge => MapResponse(charge, today));
    }

    private async Task EnsureCanViewCondominiumDelinquencyAsync(int userId, int condominiumId)
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
                AppPermissions.DelinquencyView);

            return;
        }

        throw new ForbiddenException("User cannot view condominium delinquency.");
    }

    private static DelinquencyResponseDto MapResponse(Charge charge, DateTime today)
    {
        return new DelinquencyResponseDto
        {
            ChargeId = charge.Id,
            Scope = charge.Scope,
            CondominiumId = charge.CondominiumId,
            TargetUserId = charge.TargetUserId,
            UnitId = charge.UnitId,
            Value = charge.Value,
            DueDate = charge.DueDate,
            DaysLate = (today - charge.DueDate.Date).Days,
            Description = charge.Description,
            Status = charge.Status
        };
    }
}