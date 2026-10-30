namespace backend.Services.Email;

public interface IEmailQueue
{
    // Returns immediately; the e-mail is sent in the background by EmailBackgroundService.
    void Enqueue(EmailMessage message);
}
