using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.UserCondominiumAccess;

namespace backend.Services.UserCondominiumAccess;

public interface IUserCondominiumAccessService
{
    Task<IEnumerable<MasterUserResponseDto>> GetMasterUsersAsync(int requesterUserId);

    Task<UserCondominiumAccessResponseDto> SuspendAsync(
    int requesterUserId,
    int condominiumId,
    int targetUserId,
    SuspendUserCondominiumDto dto);

    Task<UserCondominiumAccessResponseDto> ReactivateAsync(
        int requesterUserId,
        int condominiumId,
        int targetUserId);
}
