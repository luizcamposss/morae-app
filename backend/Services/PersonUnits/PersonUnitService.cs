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
        var unitExists = await _context.Units.AnyAsync(u => u.Id == unitId);

        if (!unitExists)
            throw new NotFoundException("Unit not found.");

        await _permissionService.EnsureUnitAccessAsync(userId, unitId);

        var personExists = await _context.Persons.AnyAsync(p => p.Id == dto.PersonId);

        if (!personExists)
            throw new NotFoundException("Person not found.");

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
        var unitExists = await _context.Units.AnyAsync(u => u.Id == unitId);

        if (!unitExists)
            throw new NotFoundException("Unit not found.");

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
