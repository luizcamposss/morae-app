namespace backend.Services.Email;

public interface IEmailSender
{
    Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken);
}

public enum EmailSendResult
{
    Sent,
    // Temporary problem (network, rate limit, Resend outage): worth trying again.
    RetryLater,
    // Rejected for good (invalid address, bad key): retrying would fail the same way.
    Failed
}
