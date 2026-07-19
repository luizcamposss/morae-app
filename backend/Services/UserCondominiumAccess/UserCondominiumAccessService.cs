using backend.Constants;
using backend.Data;
using backend.DTOs.UserCondominiumAccess;
using backend.Enums;
using backend.Exceptions;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using AutoMapper;

namespace backend.Services.UserCondominiumAccess;

public class UserCondominiumAccessService : IUserCondominiumAccessService
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPermissionService _permissionService;
    private readonly IMapper _mapper;

    public UserCondominiumAccessService(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        IPermissionService permissionService,
        IMapper mapper)
    {
        _context = context;
        _userManager = userManager;
        _permissionService = permissionService;
        _mapper = mapper;
    }

    public async Task<IEnumerable<MasterUserResponseDto>> GetMasterUsersAsync(int requesterUserId)
    {
        await _permissionService.EnsureMasterAsync(requesterUserId);

        return await _context.UserCondominiums
            .AsNoTracking()
            .Where(userCondominium =>
                userCondominium.Role == AppRoles.Admin &&
                userCondominium.Condominium.CreatedByUserId == requesterUserId)
            .OrderBy(userCondominium => userCondominium.User.Person.Name)
            .Select(userCondominium => new MasterUserResponseDto
            {
                UserId = userCondominium.UserId,
                PersonId = userCondominium.User.PersonId,
                PersonName = userCondominium.User.Person.Name,
                Email = userCondominium.User.Email ?? string.Empty,
                CondominiumId = userCondominium.CondominiumId,
                CondominiumName = userCondominium.Condominium.Name,
                Role = userCondominium.Role,
                Status = userCondominium.Status,
                AccessCreatedAt = userCondominium.CreatedAt,
                UserCreatedAt = userCondominium.User.CreatedAt,
                SuspendedAt = userCondominium.SuspendedAt,
                SuspensionReason = userCondominium.SuspensionReason
            })
            .ToListAsync();
    }

    public async Task<UserCondominiumAccessResponseDto> SuspendAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId,
        SuspendUserCondominiumDto dto)
    {
        if (requesterUserId == targetUserId)
            throw new BadRequestException("You cannot suspend yourself.");

        var userCondominium = await GetUserCondominiumAsync(condominiumId, targetUserId);

        await EnsureCanManageAccessAsync(requesterUserId, condominiumId, userCondominium.Role);

        if (userCondominium.Status == UserCondominiumStatus.Suspended)
            throw new BadRequestException("User access is already suspended.");

        userCondominium.Status = UserCondominiumStatus.Suspended;
        userCondominium.SuspendedAt = DateTime.UtcNow;
        userCondominium.SuspendedByUserId = requesterUserId;
        userCondominium.SuspensionReason = dto.SuspensionReason;

        await _context.SaveChangesAsync();

        return _mapper.Map<UserCondominiumAccessResponseDto>(userCondominium);
    }

    public async Task<UserCondominiumAccessResponseDto> ReactivateAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId)
    {
        if (requesterUserId == targetUserId)
            throw new BadRequestException("You cannot reactivate yourself.");

        var userCondominium = await GetUserCondominiumAsync(condominiumId, targetUserId);

        await EnsureCanManageAccessAsync(requesterUserId, condominiumId, userCondominium.Role);

        if (userCondominium.Status == UserCondominiumStatus.Active)
            throw new BadRequestException("User access is already active.");

        userCondominium.Status = UserCondominiumStatus.Active;
        userCondominium.SuspendedAt = null;
        userCondominium.SuspendedByUserId = null;
        userCondominium.SuspensionReason = null;

        await _context.SaveChangesAsync();

        return _mapper.Map<UserCondominiumAccessResponseDto>(userCondominium);
    }

    private async Task<UserCondominium> GetUserCondominiumAsync(
        int condominiumId,
        int targetUserId)
    {
        var userCondominium = await _context.UserCondominiums
            .FirstOrDefaultAsync(uc =>
                uc.UserId == targetUserId &&
                uc.CondominiumId == condominiumId);

        if (userCondominium is null)
            throw new NotFoundException("User does not belong to this condominium.");

        return userCondominium;
    }

    private async Task EnsureCanManageAccessAsync(
        int requesterUserId,
        int condominiumId,
        string targetRole)
    {
        var requester = await _userManager.FindByIdAsync(requesterUserId.ToString());

        if (requester is null)
            throw new NotFoundException("Requester user not found.");

        if (targetRole == AppRoles.Master)
            throw new ForbiddenException("Master users cannot be suspended.");

        if (await _userManager.IsInRoleAsync(requester, AppRoles.Master))
        {
            if (targetRole != AppRoles.Admin)
                throw new ForbiddenException("Master can only manage condominium admins through this flow.");

            var ownsCondominium = await _context.Condominiums
                .AnyAsync(condominium =>
                    condominium.Id == condominiumId &&
                    condominium.CreatedByUserId == requesterUserId);

            if (!ownsCondominium)
                throw new ForbiddenException("Master can only manage admins from condominiums created by themselves.");

            return;
        }

        if (await _userManager.IsInRoleAsync(requester, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAdminAsync(requesterUserId, condominiumId);

            if (targetRole == AppRoles.Admin)
                throw new ForbiddenException("Admin users cannot manage other admins.");

            if (targetRole != AppRoles.Syndic && targetRole != AppRoles.Resident)
                throw new ForbiddenException("Admin can only manage syndics or residents.");

            return;
        }

        throw new ForbiddenException("User cannot manage condominium access.");
    }
}
