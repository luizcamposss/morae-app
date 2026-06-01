using AutoMapper;
using backend.Data;
using backend.DTOs.Person;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Persons;

public class PersonService : IPersonService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public PersonService(AppDbContext context,IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<PersonResponseDto> CreateAsync(CreatePersonDto dto)
    {
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

    public async Task<IEnumerable<PersonResponseDto>> GetAllAsync()
    {
        var persons = await _context.Persons
            .AsNoTracking()
            .ToListAsync();

        return _mapper.Map<IEnumerable<PersonResponseDto>>(persons);
    }

    public async Task<PersonResponseDto?> GetByIdAsync(int id)
    {
        var person = await _context.Persons
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (person is null)
            return null;

        return _mapper.Map<PersonResponseDto>(person);
    }

    public async Task<bool> UpdateAsync(int id,UpdatePersonDto dto)
    {
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
        int id)
    {
        var person = await _context.Persons
            .FirstOrDefaultAsync(p => p.Id == id);

        if (person is null)
            return false;

        _context.Persons.Remove(person);

        await _context.SaveChangesAsync();

        return true;
    }
}