using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.News;

namespace backend.Services.News;

public interface INewsService
{
    Task<NewsResponseDto> CreateAsync(int userId, CreateNewsDto dto);
    Task<IEnumerable<NewsResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<IEnumerable<NewsResponseDto>> GetPlatformAsync(int userId);
    Task<NewsResponseDto?> GetByIdAsync(int userId, int id);
    Task<bool> UpdateAsync(int userId, int id, UpdateNewsDto dto);
    Task<bool> DeleteAsync(int userId, int id);
}