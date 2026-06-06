using backend.DTOs.Invitation;

namespace backend.Services.Invitations;

public interface IInvitationService
{
    Task<InvitationResponseDto> CreateAsync(int userId, CreateInvitationDto dto);
    Task<InvitationResponseDto?> GetByTokenAsync(string token);
    Task AcceptAsync(AcceptInvitationDto dto);
}