using backend.DTOs.Invitation;

namespace backend.Services.Invitations;

public interface IInvitationService
{
    Task<InvitationResponseDto> CreateAsync(int userId, CreateInvitationDto dto);
    Task<IEnumerable<InvitationResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<InvitationResponseDto?> GetByTokenAsync(string token);
    Task AcceptAsync(AcceptInvitationDto dto);
}
