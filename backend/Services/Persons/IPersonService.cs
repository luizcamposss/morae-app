using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Person;

namespace backend.Services.Persons;

public interface IPersonService
{
    Task<PersonResponseDto> CreateAsync(int userId, int? condominiumId, CreatePersonDto dto);
    Task<IEnumerable<PersonResponseDto>> GetAllAsync(int userId);
    Task<PersonResponseDto?> GetByIdAsync(int userId, int personId);
    Task<bool> UpdateAsync(int id, UpdatePersonDto dto);
    Task<bool> DeleteAsync(int id);
}
