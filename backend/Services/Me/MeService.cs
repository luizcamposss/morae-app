using backend.Constants;
using backend.Data;
using backend.DTOs.Me;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Me;

public class MeService : IMeService
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public MeService(AppDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<MeResponseDto> GetMeAsync(int userId)
    {
        var user = await _context.Users
        .Include(u => u.Person)
        .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            throw new NotFoundException("User not found.");

        var roles = await _userManager.GetRolesAsync(user);
        var accessLinks = await _context.UserCondominiums
            .AsNoTracking()
            .Where(uc => uc.UserId == user.Id)
            .ToListAsync();

        var isMaster = roles.Contains(AppRoles.Master);
        var hasActiveAccess = accessLinks.Any(uc => uc.Status == UserCondominiumStatus.Active);
        var latestSuspension = accessLinks
            .Where(uc => uc.Status == UserCondominiumStatus.Suspended)
            .OrderByDescending(uc => uc.SuspendedAt ?? uc.CreatedAt)
            .FirstOrDefault();
        var isSuspended = !isMaster && !hasActiveAccess && latestSuspension is not null;

        return new MeResponseDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            UserName = user.UserName ?? string.Empty,
            PersonId = user.PersonId,
            PersonName = user.Person.Name,
            PhoneNumber = user.Person.PhoneNumber,
            ProfilePhotoUrl = user.Person.ProfilePhotoUrl,
            IsSuspended = isSuspended,
            SuspensionReason = isSuspended ? latestSuspension?.SuspensionReason : null,
            SuspendedAt = isSuspended ? latestSuspension?.SuspendedAt : null,
            Roles = roles
        };
    }

    public async Task<MeResponseDto> UpdateMyProfileAsync(int userId, UpdateMyProfileDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Person)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            throw new NotFoundException("User not found.");

        user.Person.Name = dto.Name.Trim();
        user.Person.PhoneNumber = OnlyDigits(dto.PhoneNumber);
        user.Person.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetMeAsync(userId);
    }

    public async Task<MeResponseDto> UpdateProfilePhotoAsync(int userId, UpdateProfilePhotoDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Person)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            throw new NotFoundException("User not found.");

        ValidateProfilePhoto(dto.ProfilePhotoUrl);

        user.Person.ProfilePhotoUrl = string.IsNullOrWhiteSpace(dto.ProfilePhotoUrl)
            ? null
            : dto.ProfilePhotoUrl.Trim();
        user.Person.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetMeAsync(userId);
    }

    private static void ValidateProfilePhoto(string? profilePhotoUrl)
    {
        if (string.IsNullOrWhiteSpace(profilePhotoUrl))
            return;

        var normalizedValue = profilePhotoUrl.Trim();
        var isSupportedImage =
            normalizedValue.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase) ||
            normalizedValue.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) ||
            normalizedValue.StartsWith("data:image/webp;base64,", StringComparison.OrdinalIgnoreCase);

        if (!isSupportedImage)
            throw new BadRequestException("Profile photo must be a JPEG, PNG or WEBP image.");

        if (normalizedValue.Length > 700_000)
            throw new BadRequestException("Profile photo is too large.");
    }

    private static string OnlyDigits(string value)
    {
        return new string(value.Where(char.IsDigit).ToArray());
    }

    public async Task<NotificationPreferencesDto> GetNotificationPreferencesAsync(int userId)
    {
        var preference = await GetOrCreateNotificationPreferenceAsync(userId);

        return MapNotificationPreference(preference);
    }

    public async Task<NotificationPreferencesDto> UpdateNotificationPreferencesAsync(
        int userId,
        NotificationPreferencesDto dto)
    {
        var preference = await GetOrCreateNotificationPreferenceAsync(userId);

        preference.NoticesEnabled = dto.NoticesEnabled;
        preference.BillsEnabled = dto.BillsEnabled;
        preference.UnitUpdatesEnabled = dto.UnitUpdatesEnabled;
        preference.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapNotificationPreference(preference);
    }

    private async Task<UserNotificationPreference> GetOrCreateNotificationPreferenceAsync(int userId)
    {
        var userExists = await _context.Users.AnyAsync(user => user.Id == userId);

        if (!userExists)
            throw new NotFoundException("User not found.");

        var preference = await _context.UserNotificationPreferences
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (preference is not null)
            return preference;

        preference = new UserNotificationPreference
        {
            UserId = userId,
            NoticesEnabled = true,
            BillsEnabled = true,
            UnitUpdatesEnabled = true
        };

        _context.UserNotificationPreferences.Add(preference);
        await _context.SaveChangesAsync();

        return preference;
    }

    private static NotificationPreferencesDto MapNotificationPreference(
        UserNotificationPreference preference)
    {
        return new NotificationPreferencesDto
        {
            NoticesEnabled = preference.NoticesEnabled,
            BillsEnabled = preference.BillsEnabled,
            UnitUpdatesEnabled = preference.UnitUpdatesEnabled
        };
    }

    public async Task<IEnumerable<MeCondominiumResponseDto>> GetMyCondominiumsAsync(int userId)
    {
        return await _context.UserCondominiums
            .AsNoTracking()
            .Where(uc =>
                uc.UserId == userId &&
                uc.Status == UserCondominiumStatus.Active)
            .Select(uc => new MeCondominiumResponseDto
            {
                CondominiumId = uc.CondominiumId,
                CondominiumName = uc.Condominium.Name,
                Role = uc.Role,
                Status = uc.Status
            })
            .ToListAsync();
    }
    public async Task<MePermissionsResponseDto> GetMyPermissionsAsync(int userId, int condominiumId)
    {
        var userCondominium = await _context.UserCondominiums
            .AsNoTracking()
            .Include(uc => uc.Permissions)
            .FirstOrDefaultAsync(uc =>
                uc.UserId == userId &&
                uc.CondominiumId == condominiumId &&
                uc.Status == UserCondominiumStatus.Active);

        if (userCondominium is null)
            throw new ForbiddenException("You do not have access to this condominium.");

        var permissions = userCondominium.Role == AppRoles.Admin
            ? AppPermissions.All.OrderBy(permission => permission).ToList()
            : userCondominium.Permissions
                .Select(permission => permission.PermissionKey)
                .OrderBy(permission => permission)
                .ToList();

        return new MePermissionsResponseDto
        {
            CondominiumId = condominiumId,
            Role = userCondominium.Role,
            Permissions = permissions
        };
    }
    public async Task<IEnumerable<MeUnitResponseDto>> GetMyUnitsAsync(int userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            throw new NotFoundException("User not found.");

        return await _context.PersonUnits
            .AsNoTracking()
            .Where(pu => pu.PersonId == user.PersonId)
            .Select(pu => new MeUnitResponseDto
            {
                UnitId = pu.UnitId,
                BuildingId = pu.Unit.BuildingId,
                CondominiumId = pu.Unit.Building.CondominiumId,
                UnitNumber = pu.Unit.Number,
                BuildingName = pu.Unit.Building.Name,
                CondominiumName = pu.Unit.Building.Condominium.Name,
                UnitType = pu.Unit.UnitType,
                RelationshipType = pu.RelationshipType
            })
            .ToListAsync();
    }
}
