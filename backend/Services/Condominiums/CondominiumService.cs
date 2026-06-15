using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Condominium;
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

        var emailExists = await _userManager.FindByEmailAsync(dto.Admin.Email);

        if (emailExists is not null)
            throw new ConflictException("Email already registered.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var person = new Person
        {
            Name = dto.Admin.Name,
            CPF = dto.Admin.CPF,
            PhoneNumber = dto.Admin.PhoneNumber,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Persons.Add(person);
        await _context.SaveChangesAsync();

        var adminUser = new ApplicationUser
        {
            UserName = dto.Admin.Email,
            Email = dto.Admin.Email,
            PersonId = person.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var createUserResult = await _userManager.CreateAsync(adminUser, dto.Admin.Password);

        if (!createUserResult.Succeeded)
            throw new BadRequestException(string.Join(" | ", createUserResult.Errors.Select(e => e.Description)));

        var addRoleResult = await _userManager.AddToRoleAsync(adminUser, AppRoles.Admin);

        if (!addRoleResult.Succeeded)
            throw new BadRequestException(string.Join(" | ", addRoleResult.Errors.Select(e => e.Description)));

        var condominium = _mapper.Map<Condominium>(dto.Condominium);

        condominium.CreatedByUserId = masterUserId;
        condominium.CreatedAt = DateTime.UtcNow;
        condominium.UpdatedAt = DateTime.UtcNow;

        _context.Condominiums.Add(condominium);
        await _context.SaveChangesAsync();

        var userCondominium = new UserCondominium
        {
            UserId = adminUser.Id,
            CondominiumId = condominium.Id,
            Role = AppRoles.Admin,
            CreatedAt = DateTime.UtcNow
        };

        _context.UserCondominiums.Add(userCondominium);
        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return _mapper.Map<CondominiumResponseDto>(condominium);
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

        return _mapper.Map<CondominiumResponseDto>(condominium);

    }
    public async Task<IEnumerable<CondominiumResponseDto>> GetAllAsync(int userId)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var condominiums = await _context.Condominiums
            .AsNoTracking()
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

        return _mapper.Map<CondominiumResponseDto>(condominium);
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
}
