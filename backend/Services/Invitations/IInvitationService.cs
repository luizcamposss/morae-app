using backend.DTOs.Invitation;

namespace backend.Services.Invitations;

public interface IInvitationService
{
    Task<InvitationResponseDto> CreateAsync(int userId, CreateInvitationDto dto);
    Task<InvitationResponseDto> RenewAsync(int userId, int invitationId);
    Task<InvitationResponseDto> CancelAsync(int userId, int invitationId);
    Task<IEnumerable<InvitationResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<InvitationResponseDto?> GetByTokenAsync(string token);
    Task AcceptAsync(AcceptInvitationDto dto);
}
