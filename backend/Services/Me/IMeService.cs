using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Me;

namespace backend.Services.Me;

public interface IMeService
{
    Task<MeResponseDto> GetMeAsync(int userId);
    Task<IEnumerable<MeCondominiumResponseDto>> GetMyCondominiumsAsync(int userId);
    Task<MePermissionsResponseDto> GetMyPermissionsAsync(int userId, int condominiumId);
}