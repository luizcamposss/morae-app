using backend.Constants;
using backend.Enums;
using AutoMapper;
using backend.Data;
using backend.DTOs.PersonUnit;
using backend.Exceptions;
using backend.Models;
using backend.Services.Permissions;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.PersonUnits;

public class PersonUnitService : IPersonUnitService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;

    public PersonUnitService(AppDbContext context, IMapper mapper, IPermissionService permissionService)
    {
        _context = context;
        _mapper = mapper;
        _permissionService = permissionService;
    }

    public async Task<PersonUnitResponseDto> CreateAsync(int userId, int unitId, CreatePersonUnitDto dto)
    {
        var unit = await _context.Units
            .AsNoTracking()
            .Include(existingUnit => existingUnit.Building)
            .FirstOrDefaultAsync(existingUnit => existingUnit.Id == unitId);

        if (unit is null)
            throw new NotFoundException("Unit not found.");

        await _permissionService.EnsureUnitAccessAsync(userId, unitId);

        var personExists = await _context.Persons.AnyAsync(p => p.Id == dto.PersonId);

        if (!personExists)
            throw new NotFoundException("Person not found.");

        var personBelongsToCondominium = await _context.PersonCondominiums
            .AsNoTracking()
            .AnyAsync(personCondominium =>
                personCondominium.PersonId == dto.PersonId &&
                personCondominium.CondominiumId == unit.Building.CondominiumId);

        if (!personBelongsToCondominium)
            throw new ForbiddenException("This person does not belong to this condominium.");

        var personHasLinksInAnotherCondominium = await _context.PersonUnits
            .AsNoTracking()
            .AnyAsync(personUnit =>
                personUnit.PersonId == dto.PersonId &&
                personUnit.Unit.Building.CondominiumId != unit.Building.CondominiumId);

        if (personHasLinksInAnotherCondominium)
            throw new ConflictException("This person is already linked to a unit in another condominium.");

        var relationshipExists = await _context.PersonUnits.AnyAsync(pu =>
            pu.UnitId == unitId &&
            pu.PersonId == dto.PersonId &&
            pu.RelationshipType == dto.RelationshipType);

        if (relationshipExists)
            throw new ConflictException("This person already has this relationship with this unit.");

        var personUnit = _mapper.Map<PersonUnit>(dto);

        personUnit.UnitId = unitId;
        personUnit.CreatedAt = DateTime.UtcNow;

        _context.PersonUnits.Add(personUnit);
        await _context.SaveChangesAsync();

        var result = await _context.PersonUnits
            .AsNoTracking()
            .Include(pu => pu.Person)
            .Include(pu => pu.Unit)
            .FirstAsync(pu => pu.Id == personUnit.Id);

        return _mapper.Map<PersonUnitResponseDto>(result);
    }

    public async Task<IEnumerable<PersonUnitResponseDto>> GetByUnitAsync(int userId, int unitId)
    {
        var condominiumId = await _context.Units
            .Where(u => u.Id == unitId)
            .Select(u => (int?)u.Building.CondominiumId)
            .FirstOrDefaultAsync();

        if (condominiumId is null)
            throw new NotFoundException("Unit not found.");

        // Residents always see who lives in their own unit; a syndic looking at other units
        // needs the "residents.view" permission.
        if (!await _permissionService.IsUnitResidentAsync(userId, unitId) &&
            await _permissionService.GetCondominiumRoleAsync(userId, condominiumId.Value) == AppRoles.Syndic)
        {
            await _permissionService.EnsureCondominiumPermissionAsync(userId, condominiumId.Value, AppPermissions.ResidentsView);
        }

        await _permissionService.EnsureUnitAccessAsync(userId, unitId);

        var people = await _context.PersonUnits
            .AsNoTracking()
            .Include(pu => pu.Person)
            .Include(pu => pu.Unit)
            .Where(pu => pu.UnitId == unitId)
            .ToListAsync();

        return _mapper.Map<IEnumerable<PersonUnitResponseDto>>(people);
    }

    public async Task<bool> DeleteAsync(int userId, int id)
    {
        var personUnit = await _context.PersonUnits
            .FirstOrDefaultAsync(pu => pu.Id == id);

        if (personUnit is null)
            return false;

        await _permissionService.EnsureUnitAccessAsync(userId, personUnit.UnitId);

        _context.PersonUnits.Remove(personUnit);
        await _context.SaveChangesAsync();

        return true;
    }
}
