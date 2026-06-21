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

        return new MeResponseDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            UserName = user.UserName ?? string.Empty,
            PersonId = user.PersonId,
            PersonName = user.Person.Name,
            Roles = roles
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
}