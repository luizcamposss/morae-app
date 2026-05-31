using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using backend.Data;
using backend.DTOs.Condominium;
using backend.Models;
using backend.Services.Condominium;
using Microsoft.EntityFrameworkCore;

public class CondominiumService : ICondominiumService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public CondominiumService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CondominiumResponseDto> CreateAsync(CreateCondominiumDto dto, int userId)
    {
        var CNPJexists = await _context.Condominiums.AnyAsync(c => c.CNPJ == dto.CNPJ);

        if (CNPJexists)
        {
            throw new Exception("CNPJ already registered");
        }

        var condominium = _mapper.Map<Condominium>(dto);

        condominium.CreatedByUserId = userId;
        condominium.CreatedAt = DateTime.UtcNow;
        condominium.UpdatedAt = DateTime.UtcNow;

        _context.Condominiums.Add(condominium);
        _context.SaveChanges();

        return _mapper.Map<CondominiumResponseDto>(condominium);

    }
    public async Task<IEnumerable<CondominiumResponseDto>> GetAllAsync()
    {
        var condominiums = await _context.Condominiums
            .AsNoTracking()
            .ToListAsync();

        return _mapper.Map<IEnumerable<CondominiumResponseDto>>(condominiums);

    }
    public async Task<CondominiumResponseDto?> GetByIdAsync(int id)
    {
        var condominium = await _context.Condominiums
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return null;

        return _mapper.Map<CondominiumResponseDto>(condominium);
    }
    public async Task<bool> UpdateAsync(int id, UpdateCondominiumDto dto)
    {
        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return false;

        _mapper.Map(dto, condominium);

        condominium.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
    public async Task<bool> DeleteAsync(int id)
    {
        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == id);

        if (condominium is null) return false;

        _context.Condominiums.Remove(condominium);
        
        await _context.SaveChangesAsync();

        return true;
    }
}