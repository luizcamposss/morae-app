using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Charge;

namespace backend.Services.Charges;

public interface IChargeService
{
    Task<ChargeResponseDto> CreateAsync(int userId, CreateChargeDto dto);
    Task<IEnumerable<ChargeResponseDto>> GetPlatformAsync(int userId);
    Task<IEnumerable<ChargeResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<IEnumerable<ChargeResponseDto>> GetMineAsync(int userId);
    Task<ChargeResponseDto?> GetByIdAsync(int userId, int id);
    Task<bool> CancelAsync(int userId, int id, CancelChargeDto dto);
    
}