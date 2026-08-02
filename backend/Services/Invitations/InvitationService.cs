using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Invitation;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Notifications;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Invitations;

public class InvitationService : IInvitationService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPermissionService _permissionService;
    private readonly INotificationService _notificationService;

    public InvitationService(
        AppDbContext context,
        IMapper mapper,
        UserManager<ApplicationUser> userManager,
        IPermissionService permissionService,
        INotificationService notificationService)
    {
        _context = context;
        _mapper = mapper;
        _userManager = userManager;
        _permissionService = permissionService;
        _notificationService = notificationService;
    }

    public async Task<InvitationResponseDto> CreateAsync(int userId, CreateInvitationDto dto)
    {
        var creator = await _userManager.FindByIdAsync(userId.ToString());

        if (creator is null)
            throw new NotFoundException("User not found.");

        var creatorIsMaster = await _userManager.IsInRoleAsync(creator, AppRoles.Master);
        var creatorIsAdmin = await _userManager.IsInRoleAsync(creator, AppRoles.Admin);

        if (dto.Role is UserRole.Undefined or UserRole.Master)
            throw new BadRequestException("Invalid invitation role.");

        if (creatorIsMaster && dto.Role is not UserRole.Admin)
            throw new ForbiddenException("Master users can only invite condominium admins.");

        if (creatorIsAdmin && dto.Role is not UserRole.Syndic and not UserRole.Resident)
            throw new ForbiddenException("Admin users can only invite syndics or residents.");

        if (!creatorIsMaster && !creatorIsAdmin)
            throw new ForbiddenException("User cannot create invitations.");

        var condominiumExists = await _context.Condominiums
            .AnyAsync(c => c.Id == dto.CondominiumId);

        if (!condominiumExists)
            throw new NotFoundException("Condominium not found.");

        if (creatorIsAdmin)
        {
            await _permissionService.EnsureCondominiumAdminAsync(userId, dto.CondominiumId);
        }

        var person = await _context.Persons
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.PersonId);

        if (person is null)
            throw new NotFoundException("Person not found.");

        if (creatorIsMaster && person.CreatedByUserId != userId)
            throw new ForbiddenException("Master can only invite people created by themselves.");

        if (creatorIsAdmin)
        {
            var personBelongsToCondominium = await _context.PersonCondominiums
                .AsNoTracking()
                .AnyAsync(personCondominium =>
                    personCondominium.PersonId == dto.PersonId &&
                    personCondominium.CondominiumId == dto.CondominiumId);

            if (!personBelongsToCondominium)
                throw new ForbiddenException("This person does not belong to this condominium.");
        }

        var personAlreadyHasUser = await _context.Users
            .AnyAsync(u => u.PersonId == dto.PersonId);

        if (personAlreadyHasUser)
            throw new ConflictException("Esta pessoa ja possui acesso cadastrado no sistema.");

        var pendingInvitationExists = await _context.Invitations
            .AnyAsync(i =>
                i.PersonId == dto.PersonId &&
                i.CondominiumId == dto.CondominiumId &&
                i.InvitationStatus == InvitationStatus.Pending);

        if (pendingInvitationExists)
            throw new ConflictException("There is already a pending invitation for this person.");

        var emailAlreadyUsed = await _userManager.FindByEmailAsync(dto.Email);

        if (emailAlreadyUsed is not null)
            throw new ConflictException("Email already registered.");

        var invitation = _mapper.Map<Invitation>(dto);

        invitation.CreatedByUserId = userId;
        invitation.Token = Guid.NewGuid().ToString("N");
        invitation.InvitationStatus = InvitationStatus.Pending;
        invitation.ExpiresAt = DateTime.UtcNow.AddDays(7);
        invitation.CreatedAt = DateTime.UtcNow;

        _context.Invitations.Add(invitation);
        await _context.SaveChangesAsync();

        var result = await _context.Invitations
            .AsNoTracking()
            .Include(i => i.Person)
            .Include(i => i.Condominium)
            .FirstAsync(i => i.Id == invitation.Id);

        return _mapper.Map<InvitationResponseDto>(result);
    }

    public async Task<InvitationResponseDto> RenewAsync(int userId, int invitationId)
    {
        var invitation = await _context.Invitations
            .Include(i => i.Condominium)
            .Include(i => i.Person)
            .FirstOrDefaultAsync(i => i.Id == invitationId);

        if (invitation is null)
            throw new NotFoundException("Invitation not found.");

        var requester = await _userManager.FindByIdAsync(userId.ToString());

        if (requester is null)
            throw new NotFoundException("User not found.");

        var requesterIsMaster = await _userManager.IsInRoleAsync(requester, AppRoles.Master);
        var requesterIsAdmin = await _userManager.IsInRoleAsync(requester, AppRoles.Admin);

        if (!requesterIsMaster && !requesterIsAdmin)
            throw new ForbiddenException("User cannot renew invitations.");

        if (requesterIsMaster)
        {
            if (invitation.Role is not UserRole.Admin)
                throw new ForbiddenException("Master users can only renew admin invitations.");

            if (invitation.CreatedByUserId != userId)
                throw new ForbiddenException("Master can only renew invitations created by themselves.");
        }

        if (requesterIsAdmin)
        {
            if (invitation.Role is not UserRole.Syndic and not UserRole.Resident)
                throw new ForbiddenException("Admin users can only renew syndic or resident invitations.");

            await _permissionService.EnsureCondominiumAdminAsync(userId, invitation.CondominiumId);
        }

        if (invitation.InvitationStatus == InvitationStatus.Accepted)
            throw new BadRequestException("Accepted invitations cannot be renewed.");

        var isExpired = invitation.InvitationStatus == InvitationStatus.Expired ||
                        invitation.ExpiresAt < DateTime.UtcNow;

        if (!isExpired)
            throw new BadRequestException("Only expired invitations can be renewed.");

        var personAlreadyHasUser = await _context.Users
            .AnyAsync(u => u.PersonId == invitation.PersonId);

        if (personAlreadyHasUser)
            throw new ConflictException("Esta pessoa ja possui acesso cadastrado no sistema.");

        var emailAlreadyUsed = await _userManager.FindByEmailAsync(invitation.Email);

        if (emailAlreadyUsed is not null)
            throw new ConflictException("Email already registered.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        invitation.InvitationStatus = InvitationStatus.Expired;

        var renewedInvitation = new Invitation
        {
            CondominiumId = invitation.CondominiumId,
            PersonId = invitation.PersonId,
            CreatedByUserId = userId,
            Email = invitation.Email,
            Role = invitation.Role,
            Token = Guid.NewGuid().ToString("N"),
            InvitationStatus = InvitationStatus.Pending,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _context.Invitations.Add(renewedInvitation);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var result = await _context.Invitations
            .AsNoTracking()
            .Include(i => i.Person)
            .Include(i => i.Condominium)
            .FirstAsync(i => i.Id == renewedInvitation.Id);

        return _mapper.Map<InvitationResponseDto>(result);
    }

    public async Task<InvitationResponseDto> CancelAsync(int userId, int invitationId)
    {
        var invitation = await _context.Invitations
            .Include(i => i.Condominium)
            .Include(i => i.Person)
            .FirstOrDefaultAsync(i => i.Id == invitationId);

        if (invitation is null)
            throw new NotFoundException("Invitation not found.");

        var requester = await _userManager.FindByIdAsync(userId.ToString());

        if (requester is null)
            throw new NotFoundException("User not found.");

        var requesterIsMaster = await _userManager.IsInRoleAsync(requester, AppRoles.Master);
        var requesterIsAdmin = await _userManager.IsInRoleAsync(requester, AppRoles.Admin);

        if (!requesterIsMaster && !requesterIsAdmin)
            throw new ForbiddenException("User cannot cancel invitations.");

        if (requesterIsMaster)
        {
            if (invitation.Role is not UserRole.Admin)
                throw new ForbiddenException("Master users can only cancel admin invitations.");

            if (invitation.CreatedByUserId != userId)
                throw new ForbiddenException("Master can only cancel invitations created by themselves.");
        }

        if (requesterIsAdmin)
        {
            if (invitation.Role is not UserRole.Syndic and not UserRole.Resident)
                throw new ForbiddenException("Admin users can only cancel syndic or resident invitations.");

            await _permissionService.EnsureCondominiumAdminAsync(userId, invitation.CondominiumId);
        }

        if (invitation.InvitationStatus == InvitationStatus.Accepted)
            throw new BadRequestException("Accepted invitations cannot be canceled.");

        if (invitation.InvitationStatus == InvitationStatus.Canceled)
            throw new BadRequestException("Invitation already canceled.");

        if (invitation.InvitationStatus != InvitationStatus.Pending)
            throw new BadRequestException("Only pending invitations can be canceled.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            invitation.InvitationStatus = InvitationStatus.Expired;
            await _context.SaveChangesAsync();

            throw new BadRequestException("Expired invitations cannot be canceled.");
        }

        invitation.InvitationStatus = InvitationStatus.Canceled;

        await _context.SaveChangesAsync();

        return _mapper.Map<InvitationResponseDto>(invitation);
    }

    public async Task<IEnumerable<InvitationResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        var isMaster = await _userManager.IsInRoleAsync(user, AppRoles.Master);
        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);

        if (!isMaster && !isAdmin)
            throw new ForbiddenException("User cannot access invitations.");

        var condominiumExists = await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c => c.Id == condominiumId);

        if (!condominiumExists)
            throw new NotFoundException("Condominium not found.");

        if (isAdmin)
            await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);

        var query = _context.Invitations
            .AsNoTracking()
            .Include(invitation => invitation.Person)
            .Include(invitation => invitation.Condominium)
            .Where(invitation => invitation.CondominiumId == condominiumId);

        if (isMaster)
        {
            query = query.Where(invitation =>
                invitation.CreatedByUserId == userId &&
                invitation.Role == UserRole.Admin);
        }

        if (isAdmin)
        {
            query = query.Where(invitation =>
                invitation.Role == UserRole.Syndic ||
                invitation.Role == UserRole.Resident);
        }

        var invitations = await query
            .OrderByDescending(invitation => invitation.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<InvitationResponseDto>>(invitations);
    }

    public async Task<InvitationResponseDto?> GetByTokenAsync(string token)
    {
        var invitation = await _context.Invitations
            .AsNoTracking()
            .Include(i => i.Person)
            .Include(i => i.Condominium)
            .FirstOrDefaultAsync(i => i.Token == token);

        if (invitation is null)
            return null;

        if (invitation.InvitationStatus != InvitationStatus.Pending)
            throw new BadRequestException("Invitation is not pending.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
            throw new BadRequestException("Invitation expired.");

        return _mapper.Map<InvitationResponseDto>(invitation);
    }

    public async Task AcceptAsync(AcceptInvitationDto dto)
    {
        var invitation = await _context.Invitations
            .FirstOrDefaultAsync(i => i.Token == dto.Token);

        if (invitation is null)
            throw new NotFoundException("Invitation not found.");

        if (invitation.InvitationStatus is not InvitationStatus.Pending)
            throw new BadRequestException("Invitation is not pending.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            invitation.InvitationStatus = InvitationStatus.Expired;
            await _context.SaveChangesAsync();

            throw new BadRequestException("Invitation expired.");
        }

        if (!string.Equals(invitation.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException("Email does not match invitation.");

        var emailAlreadyUsed = await _userManager.FindByEmailAsync(dto.Email);

        if (emailAlreadyUsed is not null)
            throw new ConflictException("Email already registered.");

        var personAlreadyHasUser = await _context.Users
            .AnyAsync(u => u.PersonId == invitation.PersonId);

        if (personAlreadyHasUser)
            throw new ConflictException("Esta pessoa ja possui acesso cadastrado no sistema.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            PersonId = invitation.PersonId,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new BadRequestException(errors);
        }

        var roleResult = await _userManager.AddToRoleAsync(user, invitation.Role.ToString());

        if (!roleResult.Succeeded)
        {
            var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
            throw new BadRequestException(errors);
        }

        var userCondominium = new UserCondominium
        {
            UserId = user.Id,
            CondominiumId = invitation.CondominiumId,
            Role = invitation.Role.ToString(),
            CreatedAt = DateTime.UtcNow
        };

        if (invitation.Role == UserRole.Syndic)
        {
            userCondominium.Permissions = AppPermissions.All
                .Select(permission => new UserCondominiumPermission
                {
                    PermissionKey = permission,
                    CreatedAt = DateTime.UtcNow
                })
                .ToList();
        }

        _context.UserCondominiums.Add(userCondominium);

        var personCondominiumExists = await _context.PersonCondominiums
            .AnyAsync(personCondominium =>
                personCondominium.PersonId == invitation.PersonId &&
                personCondominium.CondominiumId == invitation.CondominiumId);

        if (!personCondominiumExists)
        {
            _context.PersonCondominiums.Add(new PersonCondominium
            {
                PersonId = invitation.PersonId,
                CondominiumId = invitation.CondominiumId,
                CreatedAt = DateTime.UtcNow
            });
        }

        invitation.InvitationStatus = InvitationStatus.Accepted;
        invitation.AcceptedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var acceptedInvitation = await _context.Invitations
            .AsNoTracking()
            .Include(i => i.Person)
            .Include(i => i.Condominium)
            .FirstAsync(i => i.Id == invitation.Id);

        await _notificationService.CreateAsync(
            user.Id,
            NotificationType.Access,
            "Acesso liberado",
            $"Seu acesso ao condomínio {acceptedInvitation.Condominium.Name} foi ativado.",
            GetDashboardLink(acceptedInvitation.Role),
            acceptedInvitation.CondominiumId);

        await _notificationService.CreateAsync(
            acceptedInvitation.CreatedByUserId,
            NotificationType.Invitation,
            "Convite aceito",
            $"{acceptedInvitation.Person.Name} aceitou o convite de {GetRoleLabel(acceptedInvitation.Role)}.",
            acceptedInvitation.Role == UserRole.Admin ? "/master/invitations" : "/admin/invitations",
            acceptedInvitation.CondominiumId);
    }

    private static string GetDashboardLink(UserRole role)
    {
        return role switch
        {
            UserRole.Admin => "/admin/dashboard",
            UserRole.Syndic => "/syndic/dashboard",
            UserRole.Resident => "/resident/dashboard",
            _ => "/login"
        };
    }

    private static string GetRoleLabel(UserRole role)
    {
        return role switch
        {
            UserRole.Admin => "Admin",
            UserRole.Syndic => "Síndico",
            UserRole.Resident => "Morador",
            _ => "usuário"
        };
    }
}
