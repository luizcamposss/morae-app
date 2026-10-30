using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Services.Email;

public class ResendEmailSender : IEmailSender
{
    private const string Endpoint = "https://api.resend.com/emails";

    // Reserved names that never receive e-mail (test accounts use them). Sending there would only
    // produce bounces, which hurt the sending domain's reputation.
    private static readonly string[] UndeliverableSuffixes = [".local", ".test", ".example", ".invalid", ".localhost"];

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ResendSettings _settings;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(
        IHttpClientFactory httpClientFactory,
        IOptions<ResendSettings> options,
        ILogger<ResendEmailSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = options.Value;
        _logger = logger;
    }

    public async Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            // Development without a key: show the e-mail in the log instead of sending it.
            _logger.LogInformation(
                "E-mail not sent (Resend__ApiKey is empty). To: {To} | Subject: {Subject}\n{Text}",
                message.To,
                message.Subject,
                message.Text);
            return EmailSendResult.Sent;
        }

        var to = message.To;
        var subject = message.Subject;

        if (!string.IsNullOrWhiteSpace(_settings.TestRecipient))
        {
            to = _settings.TestRecipient;
            subject = $"[teste → {message.To}] {message.Subject}";
        }
        else if (IsUndeliverable(message.To))
        {
            _logger.LogInformation(
                "E-mail not sent (test address that cannot receive e-mail). To: {To} | Subject: {Subject}",
                message.To,
                message.Subject);
            return EmailSendResult.Sent;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = JsonContent.Create(new
            {
                from = _settings.From,
                to = new[] { to },
                subject,
                html = message.Html,
                text = message.Text
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        request.Headers.Add("Idempotency-Key", message.IdempotencyKey);

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(15);

            using var response = await httpClient.SendAsync(request, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                var sent = await response.Content.ReadFromJsonAsync<ResendResponse>(cancellationToken);
                _logger.LogInformation("E-mail \"{Subject}\" accepted by Resend (id {ResendId}).", message.Subject, sent?.Id);
                return EmailSendResult.Sent;
            }

            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            var retry = response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode >= 500;

            _logger.LogWarning(
                "Resend rejected e-mail \"{Subject}\" with {StatusCode}: {Error}",
                message.Subject,
                (int)response.StatusCode,
                error);

            return retry ? EmailSendResult.RetryLater : EmailSendResult.Failed;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException
                                          && !cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(exception, "Could not reach Resend to send e-mail \"{Subject}\".", message.Subject);
            return EmailSendResult.RetryLater;
        }
    }

    private static bool IsUndeliverable(string address)
    {
        var domain = address[(address.LastIndexOf('@') + 1)..].Trim().ToLowerInvariant();

        return !domain.Contains('.') ||
               UndeliverableSuffixes.Any(suffix => domain.EndsWith(suffix, StringComparison.Ordinal));
    }

    private record ResendResponse(string? Id);
}
