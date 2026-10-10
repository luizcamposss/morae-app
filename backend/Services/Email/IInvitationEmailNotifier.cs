using backend.Models;

namespace backend.Services.Email;

public interface IInvitationEmailNotifier
{
    // Expects Person and Condominium loaded on the invitation.
    Task QueueInvitationAsync(Invitation invitation);
}
