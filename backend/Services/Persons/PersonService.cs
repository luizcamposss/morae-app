using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Person;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Persons;

public class PersonService : IPersonService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPermissionService _permissionService;

    public PersonService(AppDbContext context, IMapper mapper, UserManager<ApplicationUser> userManager, IPermissionService permissionService)
    {
        _context = context;
        _mapper = mapper;
        _userManager = userManager;
        _permissionService = permissionService;
    }

    public async Task<PersonResponseDto> CreateAsync(int userId, int? condominiumId, CreatePersonDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new Exception("User not found.");

        var isMaster = await _userManager.IsInRoleAsync(user, AppRoles.Master);
        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);

        if (!isMaster && !isAdmin)
            throw new Exception("User cannot create persons.");

        if (isAdmin)
        {
            if (condominiumId is null)
                throw new Exception("Condominium is required to create a person.");

            await _permissionService.EnsureCondominiumAccessAsync(userId, condominiumId.Value);
        }

        if (isMaster && condominiumId is not null)
        {
            var condominiumExists = await _context.Condominiums
                .AnyAsync(c => c.Id == condominiumId.Value);

            if (!condominiumExists)
                throw new Exception("Condominium not found.");
        }

        var cpfExists = await _context.Persons
            .AnyAsync(p => p.CPF == dto.CPF);

        if (cpfExists)
            throw new Exception("CPF already registered.");

        var person = _mapper.Map<Person>(dto);

        person.CreatedAt = DateTime.UtcNow;
        person.UpdatedAt = DateTime.UtcNow;

        _context.Persons.Add(person);
        await _context.SaveChangesAsync();

        return _mapper.Map<PersonResponseDto>(person);
    }

    public async Task<IEnumerable<PersonResponseDto>> GetAllAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return Enumerable.Empty<PersonResponseDto>();

        List<Person> persons;

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
        {
            persons = await _context.Persons
                .AsNoTracking()
                .ToListAsync();

            return _mapper.Map<IEnumerable<PersonResponseDto>>(persons);
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            var condominiumIds = await _context.UserCondominiums
                .AsNoTracking()
                .Where(uc => uc.UserId == userId)
                .Select(uc => uc.CondominiumId)
                .ToListAsync();

            var personIds = await _context.PersonUnits
                .AsNoTracking()
                .Where(pu => condominiumIds.Contains(pu.Unit.Building.CondominiumId))
                .Select(pu => pu.PersonId)
                .Distinct()
                .ToListAsync();

            persons = await _context.Persons
                .AsNoTracking()
                .Where(p => personIds.Contains(p.Id))
                .ToListAsync();

            return _mapper.Map<IEnumerable<PersonResponseDto>>(persons);
        }

        persons = await _context.Persons
            .AsNoTracking()
            .Where(p => p.Id == user.PersonId)
            .ToListAsync();

        return _mapper.Map<IEnumerable<PersonResponseDto>>(persons);
    }

    public async Task<PersonResponseDto?> GetByIdAsync(int userId, int personId)
    {
        var person = await _context.Persons
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == personId);

        if (person is null)
            return null;
            
        await _permissionService.EnsurePersonAccessAsync(userId, personId);

        return _mapper.Map<PersonResponseDto>(person);
    }

    public async Task<bool> UpdateAsync(
        int userId,
        int id,
        UpdatePersonDto dto)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var person = await _context.Persons
            .FirstOrDefaultAsync(p => p.Id == id);

        if (person is null)
            return false;

        var cpfExists = await _context.Persons
            .AnyAsync(p => p.CPF == dto.CPF && p.Id != id);

        if (cpfExists)
            throw new Exception("CPF already registered.");

        _mapper.Map(dto, person);

        person.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(
        int userId,
        int id)
    {
        await _permissionService.EnsureMasterAsync(userId);

        var person = await _context.Persons
            .FirstOrDefaultAsync(p => p.Id == id);

        if (person is null)
            return false;

        _context.Persons.Remove(person);

        await _context.SaveChangesAsync();

        return true;
    }
}
