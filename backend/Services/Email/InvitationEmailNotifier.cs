using backend.Data;
using backend.Models;
using backend.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services.Email;

// Used by the invitations screen and by the Master's condominium onboarding.
// The link stays available on screen to copy; the e-mail is a convenience on top of it,
// so a failed delivery never blocks the invitation.
public class InvitationEmailNotifier : IInvitationEmailNotifier
{
    private readonly AppDbContext _context;
    private readonly IEmailQueue _emailQueue;
    private readonly AppSettings _appSettings;

    public InvitationEmailNotifier(
        AppDbContext context,
        IEmailQueue emailQueue,
        IOptions<AppSettings> appSettings)
    {
        _context = context;
        _emailQueue = emailQueue;
        _appSettings = appSettings.Value;
    }

    public async Task QueueInvitationAsync(Invitation invitation)
    {
        var inviterName = await _context.Users
            .Where(user => user.Id == invitation.CreatedByUserId)
            .Select(user => user.Person.Name)
            .FirstOrDefaultAsync();

        var acceptUrl = _appSettings.BuildFrontendUrl($"accept-invitation/{invitation.Token}");

        var email = InvitationEmails.Invitation(
            invitation.Person.Name,
            string.IsNullOrWhiteSpace(inviterName) ? "A administração" : inviterName.Trim(),
            invitation.Condominium.Name,
            invitation.Role,
            invitation.ExpiresAt,
            acceptUrl);

        _emailQueue.Enqueue(email.ToMessage(invitation.Email));
    }
}
