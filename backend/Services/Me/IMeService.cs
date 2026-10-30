using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Me;

namespace backend.Services.Me;

public interface IMeService
{
    Task<MeResponseDto> GetMeAsync(int userId);
    Task<MeResponseDto> UpdateMyProfileAsync(int userId, UpdateMyProfileDto dto);
    Task<MeResponseDto> UpdateProfilePhotoAsync(int userId, UpdateProfilePhotoDto dto);
    Task<NotificationPreferencesDto> GetNotificationPreferencesAsync(int userId);
    Task<NotificationPreferencesDto> UpdateNotificationPreferencesAsync(int userId, NotificationPreferencesDto dto);
    Task<IEnumerable<MeCondominiumResponseDto>> GetMyCondominiumsAsync(int userId);
    Task<MePermissionsResponseDto> GetMyPermissionsAsync(int userId, int condominiumId);
    Task<IEnumerable<MeUnitResponseDto>> GetMyUnitsAsync(int userId);
}
