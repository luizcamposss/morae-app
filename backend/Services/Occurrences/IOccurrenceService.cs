using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Occurrence;

namespace backend.Services.Occurrences;

public interface IOccurrenceService
{
    Task<OccurrenceResponseDto> CreateAsync(int userId, CreateOccurrenceDto dto);
    Task<IEnumerable<OccurrenceResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<IEnumerable<OccurrenceResponseDto>> GetMineAsync(int userId);
    Task<OccurrenceResponseDto?> GetByIdAsync(int userId, int id);
    Task<bool> UpdateStatusAsync(int userId, int id, UpdateOccurrenceDto dto);
}