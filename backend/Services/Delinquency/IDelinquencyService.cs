using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Delinquency;

namespace backend.Services.Delinquency;

public interface IDelinquencyService
{
    Task<IEnumerable<DelinquencyResponseDto>> GetPlatformAsync(int userId);
    Task<IEnumerable<DelinquencyResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
}