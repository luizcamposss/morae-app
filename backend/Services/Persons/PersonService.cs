using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs.Person;
using backend.Exceptions;
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

    private IQueryable<PersonResponseDto> BuildPersonResponseQuery(int? condominiumId = null)
    {
        if (condominiumId is not null)
        {
            var condominiumIdValue = condominiumId.Value;

            return _context.Persons
                .AsNoTracking()
                .Where(person =>
                    _context.PersonCondominiums.Any(personCondominium =>
                        personCondominium.PersonId == person.Id &&
                        personCondominium.CondominiumId == condominiumIdValue) ||
                    _context.UserCondominiums.Any(userCondominium =>
                        userCondominium.CondominiumId == condominiumIdValue &&
                        userCondominium.User.PersonId == person.Id &&
                        (userCondominium.Role == AppRoles.Resident ||
                         userCondominium.Role == AppRoles.Syndic)))
                .Select(person => new PersonResponseDto
                {
                    Id = person.Id,
                    CondominiumId = condominiumIdValue,
                    UserId = _context.Users
                        .Where(user => user.PersonId == person.Id)
                        .Select(user => (int?)user.Id)
                        .FirstOrDefault(),
                    CondominiumName = _context.Condominiums
                        .Where(condominium => condominium.Id == condominiumIdValue)
                        .Select(condominium => condominium.Name)
                        .FirstOrDefault() ?? string.Empty,
                    Name = person.Name,
                    CPF = person.CPF,
                    PhoneNumber = person.PhoneNumber,
                    HasRegisteredUser = _context.Users.Any(user =>
                        user.PersonId == person.Id),
                    AccessRole = _context.UserCondominiums
                        .Where(userCondominium =>
                            userCondominium.CondominiumId == condominiumIdValue &&
                            userCondominium.User.PersonId == person.Id)
                        .Select(userCondominium => userCondominium.Role)
                        .FirstOrDefault() ?? string.Empty,
                    UnitCount = _context.PersonUnits.Count(personUnit =>
                        personUnit.PersonId == person.Id &&
                        personUnit.Unit.Building.CondominiumId == condominiumIdValue),
                    MainUnit = _context.PersonUnits
                        .Where(personUnit =>
                            personUnit.PersonId == person.Id &&
                            personUnit.Unit.Building.CondominiumId == condominiumIdValue)
                        .OrderBy(personUnit => personUnit.Unit.Building.Name)
                        .ThenBy(personUnit => personUnit.Unit.Number)
                        .Select(personUnit => personUnit.Unit.Building.Name + " - " + personUnit.Unit.Number)
                        .FirstOrDefault() ?? string.Empty,
                    CreatedAt = person.CreatedAt,
                    UpdatedAt = person.UpdatedAt
                });
        }

        var query = _context.PersonCondominiums
            .AsNoTracking();

        return query.Select(personCondominium => new PersonResponseDto
        {
            Id = personCondominium.Person.Id,
            CondominiumId = personCondominium.CondominiumId,
            UserId = _context.Users
                .Where(user => user.PersonId == personCondominium.PersonId)
                .Select(user => (int?)user.Id)
                .FirstOrDefault(),
            CondominiumName = personCondominium.Condominium.Name,
            Name = personCondominium.Person.Name,
            CPF = personCondominium.Person.CPF,
            PhoneNumber = personCondominium.Person.PhoneNumber,
            HasRegisteredUser = _context.Users.Any(user =>
                user.PersonId == personCondominium.PersonId),
            AccessRole = _context.UserCondominiums
                .Where(userCondominium =>
                    userCondominium.CondominiumId == personCondominium.CondominiumId &&
                    userCondominium.User.PersonId == personCondominium.PersonId)
                .Select(userCondominium => userCondominium.Role)
                .FirstOrDefault() ?? string.Empty,
            UnitCount = _context.PersonUnits.Count(personUnit =>
                personUnit.PersonId == personCondominium.PersonId &&
                personUnit.Unit.Building.CondominiumId == personCondominium.CondominiumId),
            MainUnit = _context.PersonUnits
                .Where(personUnit =>
                    personUnit.PersonId == personCondominium.PersonId &&
                    personUnit.Unit.Building.CondominiumId == personCondominium.CondominiumId)
                .OrderBy(personUnit => personUnit.Unit.Building.Name)
                .ThenBy(personUnit => personUnit.Unit.Number)
                .Select(personUnit => personUnit.Unit.Building.Name + " - " + personUnit.Unit.Number)
                .FirstOrDefault() ?? string.Empty,
            CreatedAt = personCondominium.Person.CreatedAt,
            UpdatedAt = personCondominium.Person.UpdatedAt
        });
    }

    public async Task<PersonResponseDto> CreateAsync(int userId, int? condominiumId, CreatePersonDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            throw new NotFoundException("User not found.");

        var isMaster = await _userManager.IsInRoleAsync(user, AppRoles.Master);
        var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.Admin);

        if (!isMaster && !isAdmin)
            throw new ForbiddenException("User cannot create persons.");

        if (isAdmin)
        {
            if (condominiumId is null)
                throw new BadRequestException("Condominium is required to create a person.");

            await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId.Value);
        }

        if (isMaster && condominiumId is not null)
        {
            var condominiumExists = await _context.Condominiums
                .AnyAsync(c => c.Id == condominiumId.Value);

            if (!condominiumExists)
                throw new NotFoundException("Condominium not found.");
        }

        var cpfExists = await _context.Persons
            .AnyAsync(p => p.CPF == dto.CPF);

        if (cpfExists)
            throw new ConflictException("CPF already registered.");

        var person = _mapper.Map<Person>(dto);

        person.CreatedAt = DateTime.UtcNow;
        person.UpdatedAt = DateTime.UtcNow;
        person.CreatedByUserId = userId;

        _context.Persons.Add(person);
        await _context.SaveChangesAsync();

        if (condominiumId is not null)
        {
            _context.PersonCondominiums.Add(new PersonCondominium
            {
                PersonId = person.Id,
                CondominiumId = condominiumId.Value,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return await BuildPersonResponseQuery(condominiumId.Value)
                .FirstAsync(personResponse => personResponse.Id == person.Id);
        }

        return _mapper.Map<PersonResponseDto>(person);
    }

    public async Task<IEnumerable<PersonResponseDto>> GetAllAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return Enumerable.Empty<PersonResponseDto>();

        List<Person> persons;

        if (await _userManager.IsInRoleAsync(user, AppRoles.Master))
            throw new ForbiddenException("Master cannot access condominium residents.");

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin) ||
            await _userManager.IsInRoleAsync(user, AppRoles.Syndic))
        {
            var condominiumIds = await _context.UserCondominiums
                .AsNoTracking()
                .Where(uc => uc.UserId == userId)
                .Select(uc => uc.CondominiumId)
                .ToListAsync();

            var personIdsFromCondominiumLinks = await _context.PersonCondominiums
                .AsNoTracking()
                .Where(pc => condominiumIds.Contains(pc.CondominiumId))
                .Select(pc => pc.PersonId)
                .ToListAsync();

            var personIdsFromUnitLinks = await _context.PersonUnits
                .AsNoTracking()
                .Where(pu => condominiumIds.Contains(pu.Unit.Building.CondominiumId))
                .Select(pu => pu.PersonId)
                .ToListAsync();

            var personIds = personIdsFromCondominiumLinks
                .Concat(personIdsFromUnitLinks)
                .Distinct()
                .ToList();

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

    public async Task<IEnumerable<PersonResponseDto>> GetByCondominiumAsync(int userId, int condominiumId)
    {
        await _permissionService.EnsureCondominiumPermissionAsync(
            userId,
            condominiumId,
            AppPermissions.ResidentsView);

        var query = BuildPersonResponseQuery(condominiumId);

        if (await _permissionService.IsSyndicAsync(userId))
        {
            var personId = await _context.Users
                .AsNoTracking()
                .Where(user => user.Id == userId)
                .Select(user => user.PersonId)
                .FirstAsync();

            var linkedBuildingIds = await _context.PersonUnits
                .AsNoTracking()
                .Where(personUnit =>
                    personUnit.PersonId == personId &&
                    personUnit.Unit.Building.CondominiumId == condominiumId)
                .Select(personUnit => personUnit.Unit.BuildingId)
                .Distinct()
                .ToListAsync();

            query = query.Where(person =>
                _context.PersonUnits.Any(personUnit =>
                    personUnit.PersonId == person.Id &&
                    linkedBuildingIds.Contains(personUnit.Unit.BuildingId)));
        }

        return await query
            .OrderBy(person => person.Name)
            .ToListAsync();
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

    public async Task<bool> UpdateInCondominiumAsync(
        int userId,
        int condominiumId,
        int personId,
        UpdatePersonDto dto)
    {
        await _permissionService.EnsureCondominiumAdminAsync(userId, condominiumId);

        var personBelongsToCondominium = await _context.PersonCondominiums
            .AnyAsync(personCondominium =>
                personCondominium.PersonId == personId &&
                personCondominium.CondominiumId == condominiumId);

        if (!personBelongsToCondominium)
            return false;

        var person = await _context.Persons
            .FirstOrDefaultAsync(p => p.Id == personId);

        if (person is null)
            return false;

        var cpfExists = await _context.Persons
            .AnyAsync(p => p.CPF == dto.CPF && p.Id != personId);

        if (cpfExists)
            throw new ConflictException("CPF already registered.");

        _mapper.Map(dto, person);
        person.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
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

        if (person.CreatedByUserId != userId)
            throw new ForbiddenException("Master can only update people created by themselves.");

        var cpfExists = await _context.Persons
            .AnyAsync(p => p.CPF == dto.CPF && p.Id != id);

        if (cpfExists)
            throw new ConflictException("CPF already registered.");

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

        if (person.CreatedByUserId != userId)
            throw new ForbiddenException("Master can only delete people created by themselves.");

        _context.Persons.Remove(person);

        await _context.SaveChangesAsync();

        return true;
    }
}
