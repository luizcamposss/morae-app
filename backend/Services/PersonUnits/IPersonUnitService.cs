using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.PersonUnit;

namespace backend.Services.PersonUnits;

public interface IPersonUnitService
{
    Task<PersonUnitResponseDto> CreateAsync(int unitId, CreatePersonUnitDto dto);
    Task<IEnumerable<PersonUnitResponseDto>> GetByUnitAsync(int unitId);
    Task<bool> DeleteAsync(int id);
}