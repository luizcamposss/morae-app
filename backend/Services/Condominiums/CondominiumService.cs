using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Condominium;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using backend.Services.Condominium;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public class CondominiumService : ICondominiumService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPermissionService _permissionService;

    public CondominiumService(AppDbContext context, IMapper mapper, UserManager<ApplicationUser> userManager, IPermissionService permissionService)
    {
        _context = context;
        _mapper = mapper;
        _userManager = userManager;
        _permissionService = permissionService;
    }
    public async Task<CondominiumResponseDto> OnboardAsync(int masterUserId, CreateCondominiumOnboardingDto dto)
    {
        await _permissionService.EnsureMasterAsync(masterUserId);

        var cnpjExists = await _context.Condominiums
            .AnyAsync(c => c.CNPJ == dto.Condominium.CNPJ);

        if (cnpjExists)
            throw new ConflictException("CNPJ already registered.");

        var cpfExists = await _context.Persons
            .AnyAsync(c => c.CPF == dto.Admin.CPF);

        if (cpfExists)
            throw new ConflictException("CPF already registered.");

        var adminEmail = dto.Admin.Email.Trim();

        var emailExists = await _userManager.FindByEmailAsync(adminEmail);

        if (emailExists is not null)
            throw new ConflictException("Email already registered.");

        var pendingEmailInvitationExists = await _context.Invitations
            .AnyAsync(i =>
                i.Email == adminEmail &&
                i.InvitationStatus == InvitationStatus.Pending);

        if (pendingEmailInvitationExists)
            throw new ConflictException("Email already has a pending invitation.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var person = new Person
        {
            Name = dto.Admin.Name.Trim(),
            CPF = dto.Admin.CPF.Trim(),
            PhoneNumber = dto.Admin.PhoneNumber.Trim(),
            CreatedByUserId = masterUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Persons.Add(person);
        await _context.SaveChangesAsync();

        var condominium = _mapper.Map<Condominium>(dto.Condominium);

        condominium.CreatedByUserId = masterUserId;
        condominium.CreatedAt = DateTime.UtcNow;
        condominium.UpdatedAt = DateTime.UtcNow;

        _context.Condominiums.Add(condominium);
        await _context.SaveChangesAsync();

        var invitation = new Invitation
        {
            CondominiumId = condominium.Id,
            PersonId = person.Id,
            CreatedByUserId = masterUserId,
            Email = adminEmail,
            Role = UserRole.Admin,
            Token = Guid.NewGuid().ToString("N"),
            InvitationStatus = InvitationStatus.Pending,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _context.Invitations.Add(invitation);
        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetCondominiumResponseOrThrowAsync(condominium.Id);
    }

    public async Task<CondominiumResponseDto> CreateAsync(int userId, CreateCondominiumDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var cnpjExists = await _context.Condominiums.AnyAsync(c => c.CNPJ == dto.CNPJ);

        if (cnpjExists)
        {
            throw new ConflictException("CNPJ already registered");
        }

        var condominium = _mapper.Map<Condominium>(dto);

        condominium.CreatedByUserId = userId;
        condominium.CreatedAt = DateTime.UtcNow;
        condominium.UpdatedAt = DateTime.UtcNow;

        _context.Condominiums.Add(condominium);
        await _context.SaveChangesAsync();

        return await GetCondominiumResponseOrThrowAsync(condominium.Id);

    }
    public async Task<IEnumerable<CondominiumResponseDto>> GetAllAsync(int userId)
    {
        await _permissionService.EnsureMasterAsync(userId);

        return await _context.Condominiums
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CondominiumResponseDto
            {
                Id = c.Id,
                Name = c.Name,
                CNPJ = c.CNPJ,
                Number = c.Number,
                Address = c.Address,
                City = c.City,
                State = c.State,
                EmailContact = c.EmailContact,
                Status = c.Status,
                CreatedAt = c.CreatedAt,
                AdminUserId = c.UserCondominiums
                    .Where(uc =>
                        uc.Role == AppRoles.Admin &&
                        uc.Status == UserCondominiumStatus.Active)
                    .OrderByDescending(uc => uc.CreatedAt)
                    .Select(uc => (int?)uc.UserId)
                    .FirstOrDefault(),
                AdminName = c.UserCondominiums
                    .Where(uc =>
                        uc.Role == AppRoles.Admin &&
                        uc.Status == UserCondominiumStatus.Active)
                    .OrderByDescending(uc => uc.CreatedAt)
                    .Select(uc => uc.User.Person.Name)
                    .FirstOrDefault(),
                AdminEmail = c.UserCondominiums
                    .Where(uc =>
                        uc.Role == AppRoles.Admin &&
                        uc.Status == UserCondominiumStatus.Active)
                    .OrderByDescending(uc => uc.CreatedAt)
                    .Select(uc => uc.User.Email)
                    .FirstOrDefault()
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<CondominiumResponseDto>> GetMineAsync(int userId)
    {
        var condominiums = await _context.UserCondominiums
            .AsNoTracking()
            .Where(uc => uc.UserId == userId)
            .Select(uc => uc.Condominium)
            .ToListAsync();

        return _mapper.Map<IEnumerable<CondominiumResponseDto>>(condominiums);
    }

    public async Task<CondominiumResponseDto?> GetByIdAsync(int userId, int id)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var condominium = await _context.Condominiums
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return null;

        return await GetCondominiumResponseOrThrowAsync(condominium.Id);
    }
    public async Task<bool> UpdateAsync(int userId, int id, UpdateCondominiumDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return false;

        _mapper.Map(dto, condominium);

        condominium.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> UpdateStatusAsync(int userId, int id, UpdateCondominiumStatusDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return false;

        if (condominium.CreatedByUserId != userId)
            throw new ForbiddenException("Master can only change status from condominiums created by themselves.");

        condominium.Status = dto.Status;
        condominium.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> UpdateAdminAsync(int userId, int id, UpdateCondominiumAdminDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return false;

        if (condominium.CreatedByUserId != userId)
            throw new ForbiddenException("Master can only change admins from condominiums created by themselves.");

        var targetAdmin = await _userManager.FindByIdAsync(dto.AdminUserId.ToString());

        if (targetAdmin is null)
            throw new NotFoundException("Admin user not found.");

        if (!await _userManager.IsInRoleAsync(targetAdmin, AppRoles.Admin))
            throw new BadRequestException("Selected user must be an Admin.");

        var targetBelongsToMaster = await _context.UserCondominiums
            .AsNoTracking()
            .AnyAsync(uc =>
                uc.UserId == dto.AdminUserId &&
                uc.Role == AppRoles.Admin &&
                uc.Condominium.CreatedByUserId == userId);

        if (!targetBelongsToMaster)
            throw new ForbiddenException("Selected Admin must belong to a condominium created by this Master.");

        var adminLinks = await _context.UserCondominiums
            .Where(uc =>
                uc.CondominiumId == id &&
                uc.Role == AppRoles.Admin)
            .ToListAsync();

        foreach (var adminLink in adminLinks)
        {
            if (adminLink.UserId == dto.AdminUserId)
            {
                adminLink.Status = UserCondominiumStatus.Active;
                adminLink.SuspendedAt = null;
                adminLink.SuspendedByUserId = null;
                adminLink.SuspensionReason = null;
                continue;
            }

            if (adminLink.Status != UserCondominiumStatus.Suspended)
            {
                adminLink.Status = UserCondominiumStatus.Suspended;
                adminLink.SuspendedAt = DateTime.UtcNow;
                adminLink.SuspendedByUserId = userId;
                adminLink.SuspensionReason = "Admin substituído pelo Master.";
            }
        }

        if (!adminLinks.Any(adminLink => adminLink.UserId == dto.AdminUserId))
        {
            _context.UserCondominiums.Add(new UserCondominium
            {
                UserId = dto.AdminUserId,
                CondominiumId = id,
                Role = AppRoles.Admin,
                Status = UserCondominiumStatus.Active,
                CreatedAt = DateTime.UtcNow
            });
        }

        condominium.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RemoveAdminAsync(int userId, int id)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return false;

        if (condominium.CreatedByUserId != userId)
            throw new ForbiddenException("Master can only remove admins from condominiums created by themselves.");

        var activeAdminLinks = await _context.UserCondominiums
            .Where(uc =>
                uc.CondominiumId == id &&
                uc.Role == AppRoles.Admin &&
                uc.Status == UserCondominiumStatus.Active)
            .ToListAsync();

        foreach (var adminLink in activeAdminLinks)
        {
            adminLink.Status = UserCondominiumStatus.Suspended;
            adminLink.SuspendedAt = DateTime.UtcNow;
            adminLink.SuspendedByUserId = userId;
            adminLink.SuspensionReason = "Admin removido pelo Master.";
        }

        condominium.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int userId, int id)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return false;

        _context.Condominiums.Remove(condominium);

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task<CondominiumResponseDto> GetCondominiumResponseOrThrowAsync(int id)
    {
        var condominium = await _context.Condominiums
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CondominiumResponseDto
            {
                Id = c.Id,
                Name = c.Name,
                CNPJ = c.CNPJ,
                Number = c.Number,
                Address = c.Address,
                City = c.City,
                State = c.State,
                EmailContact = c.EmailContact,
                Status = c.Status,
                CreatedAt = c.CreatedAt,
                AdminUserId = c.UserCondominiums
                    .Where(uc =>
                        uc.Role == AppRoles.Admin &&
                        uc.Status == UserCondominiumStatus.Active)
                    .OrderByDescending(uc => uc.CreatedAt)
                    .Select(uc => (int?)uc.UserId)
                    .FirstOrDefault(),
                AdminName = c.UserCondominiums
                    .Where(uc =>
                        uc.Role == AppRoles.Admin &&
                        uc.Status == UserCondominiumStatus.Active)
                    .OrderByDescending(uc => uc.CreatedAt)
                    .Select(uc => uc.User.Person.Name)
                    .FirstOrDefault(),
                AdminEmail = c.UserCondominiums
                    .Where(uc =>
                        uc.Role == AppRoles.Admin &&
                        uc.Status == UserCondominiumStatus.Active)
                    .OrderByDescending(uc => uc.CreatedAt)
                    .Select(uc => uc.User.Email)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync();

        if (condominium is null)
            throw new NotFoundException("Condominium not found.");

        return condominium;
    }
}
