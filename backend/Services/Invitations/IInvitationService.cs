using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs.Invitation;

namespace backend.Services.Invitations;

public interface IInvitationService
{
    Task<InvitationResponseDto> CreateAsync(CreateInvitationDto dto, int createdByUserId);

    Task<InvitationResponseDto?> GetByTokenAsync(string token);

    Task AcceptAsync(AcceptInvitationDto dto);
}