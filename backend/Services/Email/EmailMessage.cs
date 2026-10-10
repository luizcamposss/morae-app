namespace backend.Services.Email;

public record EmailMessage(string To, string Subject, string Html, string Text)
{
    // Sent to Resend on every attempt, so a retry never delivers the same e-mail twice.
    public string IdempotencyKey { get; } = Guid.NewGuid().ToString("N");
}
