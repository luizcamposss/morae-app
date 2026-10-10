using System.Threading.Channels;

namespace backend.Services.Email;

public class EmailQueue : IEmailQueue
{
    private const int Capacity = 1000;

    private readonly Channel<EmailMessage> _channel = Channel.CreateBounded<EmailMessage>(
        new BoundedChannelOptions(Capacity)
        {
            SingleReader = true,
            FullMode = BoundedChannelFullMode.DropWrite
        });

    private readonly ILogger<EmailQueue> _logger;

    public EmailQueue(ILogger<EmailQueue> logger)
    {
        _logger = logger;
    }

    public ChannelReader<EmailMessage> Reader => _channel.Reader;

    public void Enqueue(EmailMessage message)
    {
        // An e-mail must never break the action that triggered it, so a full queue only logs.
        if (!_channel.Writer.TryWrite(message))
            _logger.LogError("E-mail queue is full; dropped e-mail \"{Subject}\".", message.Subject);
    }
}
