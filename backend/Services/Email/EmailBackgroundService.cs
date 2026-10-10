namespace backend.Services.Email;

// The "mail carrier": takes e-mails from the queue one by one and hands them to Resend,
// so the request that created the e-mail never waits for it.
public class EmailBackgroundService : BackgroundService
{
    private static readonly TimeSpan[] RetryDelays =
    [
        TimeSpan.FromSeconds(5),
        TimeSpan.FromSeconds(30),
        TimeSpan.FromMinutes(2)
    ];

    private readonly EmailQueue _queue;
    private readonly IEmailSender _sender;
    private readonly ILogger<EmailBackgroundService> _logger;

    public EmailBackgroundService(
        EmailQueue queue,
        IEmailSender sender,
        ILogger<EmailBackgroundService> logger)
    {
        _queue = queue;
        _sender = sender;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var message in _queue.Reader.ReadAllAsync(stoppingToken))
                await SendWithRetriesAsync(message, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // API shutting down.
        }
    }

    private async Task SendWithRetriesAsync(EmailMessage message, CancellationToken stoppingToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            EmailSendResult result;

            try
            {
                result = await _sender.SendAsync(message, stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                _logger.LogError(exception, "Unexpected error sending e-mail \"{Subject}\".", message.Subject);
                result = EmailSendResult.Failed;
            }

            if (result == EmailSendResult.Sent)
                return;

            if (result == EmailSendResult.Failed || attempt >= RetryDelays.Length)
            {
                _logger.LogError(
                    "Gave up sending e-mail \"{Subject}\" after {Attempts} attempt(s).",
                    message.Subject,
                    attempt + 1);
                return;
            }

            await Task.Delay(RetryDelays[attempt], stoppingToken);
        }
    }
}
