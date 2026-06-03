using AutoMapper;
using backend.Data;
using backend.DTOs.Invitation;
using backend.Enums;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Invitations;

public class InvitationService : IInvitationService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly UserManager<ApplicationUser> _userManager;

    public InvitationService(AppDbContext context, IMapper mapper, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _mapper = mapper;
        _userManager = userManager;
    }

    public async Task<InvitationResponseDto> CreateAsync(CreateInvitationDto dto, int createdByUserId)
    {
        var condominiumExists = await _context.Condominiums
            .AnyAsync(c => c.Id == dto.CondominiumId);

        if (!condominiumExists)
            throw new Exception("Condominium not found.");

        var personExists = await _context.Persons
            .AnyAsync(p => p.Id == dto.PersonId);

        if (!personExists)
            throw new Exception("Person not found.");

        var pendingInvitationExists = await _context.Invitations
            .AnyAsync(i =>
                i.PersonId == dto.PersonId &&
                i.CondominiumId == dto.CondominiumId &&
                i.InvitationStatus == InvitationStatus.Pending);

        if (pendingInvitationExists)
            throw new Exception("There is already a pending invitation for this person.");

        var emailAlreadyUsed = await _userManager.FindByEmailAsync(dto.Email);

        if (emailAlreadyUsed != null)
            throw new Exception("Email already registered.");

        var invitation = _mapper.Map<Invitation>(dto);

        invitation.CreatedByUserId = createdByUserId;
        invitation.Token = Guid.NewGuid().ToString("N");
        invitation.InvitationStatus = InvitationStatus.Pending;
        invitation.ExpiresAt = DateTime.UtcNow.AddDays(7);
        invitation.CreatedAt = DateTime.UtcNow;

        _context.Invitations.Add(invitation);
        await _context.SaveChangesAsync();

        var result = await _context.Invitations
            .AsNoTracking()
            .Include(i => i.Person)
            .FirstAsync(i => i.Id == invitation.Id);

        return _mapper.Map<InvitationResponseDto>(result);
    }

    public async Task<InvitationResponseDto?> GetByTokenAsync(string token)
    {
        var invitation = await _context.Invitations
            .AsNoTracking()
            .Include(i => i.Person)
            .FirstOrDefaultAsync(i => i.Token == token);

        if (invitation is null)
            return null;

        if (invitation.InvitationStatus != InvitationStatus.Pending)
            throw new Exception("Invitation is not pending.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
            throw new Exception("Invitation expired.");

        return _mapper.Map<InvitationResponseDto>(invitation);
    }

    public async Task AcceptAsync(AcceptInvitationDto dto)
    {
        var invitation = await _context.Invitations
            .FirstOrDefaultAsync(i => i.Token == dto.Token);

        if (invitation is null)
            throw new Exception("Invitation not found.");

        if (invitation.InvitationStatus != InvitationStatus.Pending)
            throw new Exception("Invitation is not pending.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            invitation.InvitationStatus = InvitationStatus.Expired;
            await _context.SaveChangesAsync();

            throw new Exception("Invitation expired.");
        }

        if (!string.Equals(invitation.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            throw new Exception("Email does not match invitation.");

        var emailAlreadyUsed = await _userManager.FindByEmailAsync(dto.Email);

        if (emailAlreadyUsed != null)
            throw new Exception("Email already registered.");

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
            throw new Exception(errors);
        }

        await _userManager.AddToRoleAsync(user, invitation.Role.ToString());

        invitation.InvitationStatus = InvitationStatus.Accepted;
        invitation.AcceptedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }
}