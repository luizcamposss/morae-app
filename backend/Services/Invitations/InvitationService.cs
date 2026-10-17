using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Invitation;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Email;
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
    private readonly IInvitationEmailNotifier _invitationEmailNotifier;

    public InvitationService(
        AppDbContext context,
        IMapper mapper,
        UserManager<ApplicationUser> userManager,
        IPermissionService permissionService,
        INotificationService notificationService,
        IInvitationEmailNotifier invitationEmailNotifier)
    {
        _context = context;
        _mapper = mapper;
        _userManager = userManager;
        _permissionService = permissionService;
        _notificationService = notificationService;
        _invitationEmailNotifier = invitationEmailNotifier;
    }

    public async Task<InvitationResponseDto> CreateAsync(int userId, CreateInvitationDto dto)
    {
        var creator = await _userManager.FindByIdAsync(userId.ToString());

        if (creator is null)
            throw new NotFoundException("Usuário não encontrado.");

        var creatorIsMaster = await _userManager.IsInRoleAsync(creator, AppRoles.Master);
        var creatorIsAdmin = await _userManager.IsInRoleAsync(creator, AppRoles.Admin);

        if (dto.Role is UserRole.Undefined or UserRole.Master)
            throw new BadRequestException("Tipo de convite inválido.");

        if (creatorIsMaster && dto.Role is not UserRole.Admin)
            throw new ForbiddenException("O Master só convida administradores de condomínio.");

        if (creatorIsAdmin && dto.Role is not UserRole.Syndic and not UserRole.Resident)
            throw new ForbiddenException("O administrador só convida síndicos ou moradores.");

        if (!creatorIsMaster && !creatorIsAdmin)
            throw new ForbiddenException("Você não tem permissão para criar convites.");

        var condominiumExists = await _context.Condominiums
            .AnyAsync(c => c.Id == dto.CondominiumId);

        if (!condominiumExists)
            throw new NotFoundException("Condomínio não encontrado.");

        if (creatorIsAdmin)
        {
            await _permissionService.EnsureCondominiumAdminAsync(userId, dto.CondominiumId);
        }

        var person = await _context.Persons
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.PersonId);

        if (person is null)
            throw new NotFoundException("Pessoa não encontrada.");

        if (creatorIsMaster && person.CreatedByUserId != userId)
            throw new ForbiddenException("Você só pode convidar pessoas cadastradas por você.");

        if (creatorIsAdmin)
        {
            var personBelongsToCondominium = await _context.PersonCondominiums
                .AsNoTracking()
                .AnyAsync(personCondominium =>
                    personCondominium.PersonId == dto.PersonId &&
                    personCondominium.CondominiumId == dto.CondominiumId);

            if (!personBelongsToCondominium)
                throw new ForbiddenException("Esta pessoa não pertence a este condomínio.");
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
            throw new ConflictException("Já existe um convite pendente para esta pessoa.");

        var emailAlreadyUsed = await _userManager.FindByEmailAsync(dto.Email);

        if (emailAlreadyUsed is not null)
            throw new ConflictException("Este e-mail já está cadastrado.");

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

        await _invitationEmailNotifier.QueueInvitationAsync(result);

        return _mapper.Map<InvitationResponseDto>(result);
    }

    public async Task<InvitationResponseDto> RenewAsync(int userId, int invitationId)
    {
        var invitation = await _context.Invitations
            .Include(i => i.Condominium)
            .Include(i => i.Person)
            .FirstOrDefaultAsync(i => i.Id == invitationId);

        if (invitation is null)
            throw new NotFoundException("Convite não encontrado.");

        var requester = await _userManager.FindByIdAsync(userId.ToString());

        if (requester is null)
            throw new NotFoundException("Usuário não encontrado.");

        var requesterIsMaster = await _userManager.IsInRoleAsync(requester, AppRoles.Master);
        var requesterIsAdmin = await _userManager.IsInRoleAsync(requester, AppRoles.Admin);

        if (!requesterIsMaster && !requesterIsAdmin)
            throw new ForbiddenException("Você não tem permissão para reenviar convites.");

        if (requesterIsMaster)
        {
            if (invitation.Role is not UserRole.Admin)
                throw new ForbiddenException("O Master só reenvia convites de administradores.");

            if (invitation.CreatedByUserId != userId)
                throw new ForbiddenException("Você só pode reenviar convites criados por você.");
        }

        if (requesterIsAdmin)
        {
            if (invitation.Role is not UserRole.Syndic and not UserRole.Resident)
                throw new ForbiddenException("O administrador só reenvia convites de síndicos ou moradores.");

            await _permissionService.EnsureCondominiumAdminAsync(userId, invitation.CondominiumId);
        }

        if (invitation.InvitationStatus == InvitationStatus.Accepted)
            throw new BadRequestException("Este convite já foi aceito.");

        var isExpired = invitation.InvitationStatus == InvitationStatus.Expired ||
                        invitation.ExpiresAt < DateTime.UtcNow;

        if (!isExpired)
            throw new BadRequestException("Só convites expirados podem ser reenviados. Este ainda está válido: copie o link.");

        var personAlreadyHasUser = await _context.Users
            .AnyAsync(u => u.PersonId == invitation.PersonId);

        if (personAlreadyHasUser)
            throw new ConflictException("Esta pessoa ja possui acesso cadastrado no sistema.");

        var emailAlreadyUsed = await _userManager.FindByEmailAsync(invitation.Email);

        if (emailAlreadyUsed is not null)
            throw new ConflictException("Este e-mail já está cadastrado.");

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

        await _invitationEmailNotifier.QueueInvitationAsync(result);

        return _mapper.Map<InvitationResponseDto>(result);
    }

    public async Task<InvitationResponseDto> CancelAsync(int userId, int invitationId)
    {
        var invitation = await _context.Invitations
            .Include(i => i.Condominium)
            .Include(i => i.Person)
            .FirstOrDefaultAsync(i => i.Id == invitationId);

        if (invitation is null)
            throw new NotFoundException("Convite não encontrado.");

        var requester = await _userManager.FindByIdAsync(userId.ToString());

        if (requester is null)
            throw new NotFoundException("Usuário não encontrado.");

        var requesterIsMaster = await _userManager.IsInRoleAsync(requester, AppRoles.Master);
        var requesterIsAdmin = await _userManager.IsInRoleAsync(requester, AppRoles.Admin);

        if (!requesterIsMaster && !requesterIsAdmin)
            throw new ForbiddenException("Você não tem permissão para cancelar convites.");

        if (requesterIsMaster)
        {
            if (invitation.Role is not UserRole.Admin)
                throw new ForbiddenException("O Master só cancela convites de administradores.");

            if (invitation.CreatedByUserId != userId)
                throw new ForbiddenException("Você só pode cancelar convites criados por você.");
        }

        if (requesterIsAdmin)
        {
            if (invitation.Role is not UserRole.Syndic and not UserRole.Resident)
                throw new ForbiddenException("O administrador só cancela convites de síndicos ou moradores.");

            await _permissionService.EnsureCondominiumAdminAsync(userId, invitation.CondominiumId);
        }

        if (invitation.InvitationStatus == InvitationStatus.Accepted)
            throw new BadRequestException("Este convite já foi aceito e não pode ser cancelado.");

        if (invitation.InvitationStatus == InvitationStatus.Canceled)
            throw new BadRequestException("Este convite já foi cancelado.");

        if (invitation.InvitationStatus != InvitationStatus.Pending)
            throw new BadRequestException("Só convites pendentes podem ser cancelados.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            invitation.InvitationStatus = InvitationStatus.Expired;
            await _context.SaveChangesAsync();

            throw new BadRequestException("Este convite já expirou.");
        }

        invitation.InvitationStatus = InvitationStatus.Canceled;

        await _context.SaveChangesAsync();

        return _mapper.Map<InvitationResponseDto>(invitation);
    }

    public async Task<IEnumerable<InvitationResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("Usuário não encontrado.");

        var isMaster = await _userManager.IsInRoleAsync(user, AppRoles.Master);
        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);

        if (!isMaster && !isAdmin)
            throw new ForbiddenException("Você não tem acesso aos convites.");

        var condominiumExists = await _context.Condominiums
            .AsNoTracking()
            .AnyAsync(c => c.Id == condominiumId);

        if (!condominiumExists)
            throw new NotFoundException("Condomínio não encontrado.");

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
            throw new BadRequestException("Este convite não está mais pendente.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
            throw new BadRequestException("Este convite expirou. Peça um novo para quem te convidou.");

        return _mapper.Map<InvitationResponseDto>(invitation);
    }

    public async Task AcceptAsync(AcceptInvitationDto dto)
    {
        var invitation = await _context.Invitations
            .FirstOrDefaultAsync(i => i.Token == dto.Token);

        if (invitation is null)
            throw new NotFoundException("Convite não encontrado.");

        if (invitation.InvitationStatus is not InvitationStatus.Pending)
            throw new BadRequestException("Este convite não está mais pendente.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            invitation.InvitationStatus = InvitationStatus.Expired;
            await _context.SaveChangesAsync();

            throw new BadRequestException("Este convite expirou. Peça um novo para quem te convidou.");
        }

        if (!string.Equals(invitation.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException("Este e-mail não é o do convite.");

        var emailAlreadyUsed = await _userManager.FindByEmailAsync(dto.Email);

        if (emailAlreadyUsed is not null)
            throw new ConflictException("Este e-mail já está cadastrado.");

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
            // Like in the market: a syndic runs the whole condominium until the Admin restricts it.
            userCondominium.ManagesAllBuildings = true;
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
