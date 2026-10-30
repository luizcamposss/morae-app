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
using backend.Services.Notifications;

namespace backend.Services.UserCondominiumAccess;

public class UserCondominiumAccessService : IUserCondominiumAccessService
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPermissionService _permissionService;
    private readonly IMapper _mapper;
    private readonly INotificationService _notificationService;

    public UserCondominiumAccessService(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        IPermissionService permissionService,
        IMapper mapper,
        INotificationService notificationService)
    {
        _context = context;
        _userManager = userManager;
        _permissionService = permissionService;
        _mapper = mapper;
        _notificationService = notificationService;
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

    public async Task<MasterUserResponseDto> CreateMasterUserAsync(
        int requesterUserId,
        CreateMasterUserDto dto)
    {
        await _permissionService.EnsureMasterAsync(requesterUserId);

        var condominium = await _context.Condominiums
            .AsNoTracking()
            .FirstOrDefaultAsync(c =>
                c.Id == dto.CondominiumId &&
                c.CreatedByUserId == requesterUserId);

        if (condominium is null)
            throw new ForbiddenException("Você só pode criar administradores para condomínios cadastrados por você.");

        var existingUser = await _userManager.FindByEmailAsync(dto.Email);

        if (existingUser is not null)
            throw new BadRequestException("Este e-mail já está em uso.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var person = new Person
        {
            Name = dto.Name.Trim(),
            CPF = dto.CPF.Trim(),
            PhoneNumber = dto.PhoneNumber.Trim(),
            CreatedByUserId = requesterUserId
        };

        _context.Persons.Add(person);
        await _context.SaveChangesAsync();

        var user = new ApplicationUser
        {
            UserName = dto.Email.Trim(),
            Email = dto.Email.Trim(),
            PhoneNumber = dto.PhoneNumber.Trim(),
            PersonId = person.Id
        };

        var createUserResult = await _userManager.CreateAsync(user, dto.Password);

        if (!createUserResult.Succeeded)
            throw new BadRequestException(string.Join(" ", createUserResult.Errors.Select(e => e.Description)));

        var addRoleResult = await _userManager.AddToRoleAsync(user, AppRoles.Admin);

        if (!addRoleResult.Succeeded)
            throw new BadRequestException(string.Join(" ", addRoleResult.Errors.Select(e => e.Description)));

        var userCondominium = new UserCondominium
        {
            UserId = user.Id,
            CondominiumId = dto.CondominiumId,
            Role = AppRoles.Admin,
            Status = UserCondominiumStatus.Active
        };

        _context.UserCondominiums.Add(userCondominium);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return await GetMasterUserResponseOrThrowAsync(userCondominium.Id);
    }

    public async Task<UserCondominiumAccessResponseDto> SuspendAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId,
        SuspendUserCondominiumDto dto)
    {
        if (requesterUserId == targetUserId)
            throw new BadRequestException("Você não pode suspender o próprio acesso.");

        var userCondominium = await GetUserCondominiumAsync(condominiumId, targetUserId);

        await EnsureCanManageAccessAsync(requesterUserId, condominiumId, userCondominium.Role);

        if (userCondominium.Status == UserCondominiumStatus.Suspended)
            throw new BadRequestException("Este acesso já está suspenso.");

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
            throw new BadRequestException("Você não pode reativar o próprio acesso.");

        var userCondominium = await GetUserCondominiumAsync(condominiumId, targetUserId);

        await EnsureCanManageAccessAsync(requesterUserId, condominiumId, userCondominium.Role);

        if (userCondominium.Status == UserCondominiumStatus.Active)
            throw new BadRequestException("Este acesso já está ativo.");

        userCondominium.Status = UserCondominiumStatus.Active;
        userCondominium.SuspendedAt = null;
        userCondominium.SuspendedByUserId = null;
        userCondominium.SuspensionReason = null;

        await _context.SaveChangesAsync();

        return _mapper.Map<UserCondominiumAccessResponseDto>(userCondominium);
    }

    public async Task<UserCondominiumAccessResponseDto> UpdateRoleAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId,
        UpdateUserCondominiumRoleDto dto)
    {
        var normalizedRole = dto.Role.Trim();

        if (normalizedRole != AppRoles.Resident && normalizedRole != AppRoles.Syndic)
            throw new BadRequestException("O papel precisa ser morador ou síndico.");

        var userCondominium = await GetUserCondominiumAsync(condominiumId, targetUserId);

        await EnsureCanManageAccessAsync(requesterUserId, condominiumId, userCondominium.Role);

        if (userCondominium.Role == normalizedRole)
            return _mapper.Map<UserCondominiumAccessResponseDto>(userCondominium);

        var targetUser = await _userManager.FindByIdAsync(targetUserId.ToString());

        if (targetUser is null)
            throw new NotFoundException("Usuário não encontrado.");

        var previousRole = userCondominium.Role;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var now = DateTime.UtcNow;
        var targetPerson = await _context.Persons
            .FirstOrDefaultAsync(person => person.Id == targetUser.PersonId);

        userCondominium.Role = normalizedRole;
        targetUser.UpdatedAt = now;

        if (normalizedRole == AppRoles.Syndic)
            userCondominium.ManagesAllBuildings = true;

        if (normalizedRole == AppRoles.Syndic && userCondominium.Permissions.Count == 0)
        {
            userCondominium.Permissions = AppPermissions.All
                .Select(permission => new UserCondominiumPermission
                {
                    UserCondominiumId = userCondominium.Id,
                    PermissionKey = permission,
                    CreatedAt = now
                })
                .ToList();
        }

        if (normalizedRole == AppRoles.Resident && userCondominium.Permissions.Count > 0)
        {
            _context.UserCondominiumPermissions.RemoveRange(userCondominium.Permissions);
        }

        if (normalizedRole != AppRoles.Syndic)
        {
            userCondominium.ManagesAllBuildings = false;
            await _context.UserCondominiumBuildings
                .Where(managed => managed.UserCondominiumId == userCondominium.Id)
                .ExecuteDeleteAsync();
        }

        if (targetPerson is not null)
            targetPerson.UpdatedAt = now;

        _context.Users.Update(targetUser);
        await _context.SaveChangesAsync();

        var hasPreviousRoleInAnotherCondominium = await _context.UserCondominiums
            .AnyAsync(access =>
                access.UserId == targetUserId &&
                access.CondominiumId != condominiumId &&
                access.Role == previousRole);

        if (!hasPreviousRoleInAnotherCondominium &&
            await _userManager.IsInRoleAsync(targetUser, previousRole))
        {
            var removeRoleResult = await _userManager.RemoveFromRoleAsync(targetUser, previousRole);

            if (!removeRoleResult.Succeeded)
                throw new BadRequestException(string.Join(" ", removeRoleResult.Errors.Select(error => error.Description)));
        }

        if (!await _userManager.IsInRoleAsync(targetUser, normalizedRole))
        {
            var addRoleResult = await _userManager.AddToRoleAsync(targetUser, normalizedRole);

            if (!addRoleResult.Succeeded)
                throw new BadRequestException(string.Join(" ", addRoleResult.Errors.Select(error => error.Description)));
        }

        await transaction.CommitAsync();

        await _notificationService.CreateAsync(
            targetUserId,
            NotificationType.Access,
            "Perfil atualizado",
            $"Seu acesso foi alterado para {GetRoleLabel(normalizedRole)}.",
            GetDashboardLink(normalizedRole),
            condominiumId);

        return _mapper.Map<UserCondominiumAccessResponseDto>(userCondominium);
    }

    public async Task DeleteAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId)
    {
        if (requesterUserId == targetUserId)
            throw new BadRequestException("Você não pode remover o próprio acesso.");

        var userCondominium = await GetUserCondominiumAsync(condominiumId, targetUserId);

        await EnsureCanManageAccessAsync(requesterUserId, condominiumId, userCondominium.Role);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        _context.UserCondominiums.Remove(userCondominium);
        await _context.SaveChangesAsync();

        var hasRemainingAccess = await _context.UserCondominiums
            .AnyAsync(uc => uc.UserId == targetUserId);

        if (!hasRemainingAccess)
        {
            var targetUser = await _userManager.FindByIdAsync(targetUserId.ToString());

            if (targetUser is not null)
            {
                var deleteResult = await _userManager.DeleteAsync(targetUser);

                if (!deleteResult.Succeeded)
                    throw new BadRequestException(string.Join(" ", deleteResult.Errors.Select(e => e.Description)));
            }
        }

        await transaction.CommitAsync();
    }

    private async Task<UserCondominium> GetUserCondominiumAsync(
        int condominiumId,
        int targetUserId)
    {
        var userCondominium = await _context.UserCondominiums
            .Include(uc => uc.Permissions)
            .FirstOrDefaultAsync(uc =>
                uc.UserId == targetUserId &&
                uc.CondominiumId == condominiumId);

        if (userCondominium is null)
            throw new NotFoundException("Este usuário não pertence a este condomínio.");

        return userCondominium;
    }

    private async Task<MasterUserResponseDto> GetMasterUserResponseOrThrowAsync(int userCondominiumId)
    {
        var user = await _context.UserCondominiums
            .AsNoTracking()
            .Where(userCondominium => userCondominium.Id == userCondominiumId)
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
            .FirstOrDefaultAsync();

        if (user is null)
            throw new NotFoundException("Acesso não encontrado.");

        return user;
    }

    private async Task EnsureCanManageAccessAsync(
        int requesterUserId,
        int condominiumId,
        string targetRole)
    {
        var requester = await _userManager.FindByIdAsync(requesterUserId.ToString());

        if (requester is null)
            throw new NotFoundException("Usuário não encontrado.");

        if (targetRole == AppRoles.Master)
            throw new ForbiddenException("O acesso do Master não pode ser suspenso.");

        if (await _userManager.IsInRoleAsync(requester, AppRoles.Master))
        {
            if (targetRole != AppRoles.Admin)
                throw new ForbiddenException("Por aqui, o Master só gerencia administradores de condomínio.");

            var ownsCondominium = await _context.Condominiums
                .AnyAsync(condominium =>
                    condominium.Id == condominiumId &&
                    condominium.CreatedByUserId == requesterUserId);

            if (!ownsCondominium)
                throw new ForbiddenException("Você só pode gerenciar administradores de condomínios cadastrados por você.");

            return;
        }

        if (await _userManager.IsInRoleAsync(requester, AppRoles.Admin))
        {
            await _permissionService.EnsureCondominiumAdminAsync(requesterUserId, condominiumId);

            if (targetRole == AppRoles.Admin)
                throw new ForbiddenException("O administrador não pode gerenciar outros administradores.");

            if (targetRole != AppRoles.Syndic && targetRole != AppRoles.Resident)
                throw new ForbiddenException("O administrador só gerencia síndicos e moradores.");

            return;
        }

        throw new ForbiddenException("Você não tem permissão para gerenciar acessos deste condomínio.");
    }

    private static string GetRoleLabel(string role)
    {
        return role switch
        {
            AppRoles.Syndic => "Síndico",
            AppRoles.Resident => "Morador",
            _ => role
        };
    }

    private static string GetDashboardLink(string role)
    {
        return role switch
        {
            AppRoles.Syndic => "/syndic/dashboard",
            AppRoles.Resident => "/resident/dashboard",
            _ => "/login"
        };
    }
}
