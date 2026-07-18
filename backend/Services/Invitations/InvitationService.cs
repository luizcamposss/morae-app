using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Invitation;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
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

    public InvitationService(AppDbContext context, IMapper mapper, UserManager<ApplicationUser> userManager, IPermissionService permissionService)
    {
        _context = context;
        _mapper = mapper;
        _userManager = userManager;
        _permissionService = permissionService;
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
            throw new ConflictException("Person already has a registered user.");

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
            throw new ConflictException("Person already has a registered user.");

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

        _context.UserCondominiums.Add(new UserCondominium
        {
            UserId = user.Id,
            CondominiumId = invitation.CondominiumId,
            Role = invitation.Role.ToString(),
            CreatedAt = DateTime.UtcNow
        });

        invitation.InvitationStatus = InvitationStatus.Accepted;
        invitation.AcceptedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}
