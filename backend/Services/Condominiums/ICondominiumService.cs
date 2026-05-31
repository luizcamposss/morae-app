using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Condominium;
using Microsoft.AspNetCore.Mvc;

namespace backend.Services.Condominium;

public interface ICondominiumService
{
    Task<CondominiumResponseDto> CreateAsync(CreateCondominiumDto dto, int id);
    Task<IEnumerable<CondominiumResponseDto>> GetAllAsync();
    Task<CondominiumResponseDto?> GetByIdAsync(int id);
    Task<bool> UpdateAsync(int id, UpdateCondominiumDto dto);

    Task<bool> DeleteAsync(int id);
}