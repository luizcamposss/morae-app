using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Person;

namespace backend.Services.Persons;

public interface IPersonService
{
    Task<PersonResponseDto> CreateAsync(CreatePersonDto dto);
    Task<IEnumerable<PersonResponseDto>> GetAllAsync();
    Task<PersonResponseDto?> GetByIdAsync(int id);
    Task<bool> UpdateAsync(int id, UpdatePersonDto dto);
    Task<bool> DeleteAsync(int id);
}