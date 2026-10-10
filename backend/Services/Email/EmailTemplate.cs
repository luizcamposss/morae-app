using System.Net;
using System.Text;

namespace backend.Services.Email;

// One visual layout for every MORAÊ e-mail: greeting, paragraphs, an optional button and a note.
// Everything is HTML-encoded, so names typed by users cannot inject markup.
public class EmailTemplate
{
    private const string BrandColor = "#0f766e";

    public required string Subject { get; init; }
    public required string Title { get; init; }
    public string? Greeting { get; init; }
    public IReadOnlyList<string> Paragraphs { get; init; } = [];
    // Label/value rows shown as a small table (amount, due date...).
    public IReadOnlyList<(string Label, string Value)> Details { get; init; } = [];
    public string? ButtonText { get; init; }
    public string? ButtonUrl { get; init; }
    public string? Note { get; init; }

    public EmailMessage ToMessage(string to)
    {
        return new EmailMessage(to, Subject, BuildHtml(), BuildText());
    }

    private string BuildHtml()
    {
        var body = new StringBuilder();

        if (Greeting is not null)
            body.Append($"<p style=\"margin:0 0 16px\">{Encode(Greeting)}</p>");

        foreach (var paragraph in Paragraphs)
            body.Append($"<p style=\"margin:0 0 16px\">{Encode(paragraph)}</p>");

        if (Details.Count > 0)
        {
            body.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" " +
                        "style=\"width:100%;margin:0 0 16px;border:1px solid #e5e7eb;border-radius:8px\">");

            foreach (var (label, value) in Details)
            {
                body.Append(
                    "<tr>" +
                    $"<td style=\"padding:10px 14px;color:#6b7280;border-bottom:1px solid #f3f4f6\">{Encode(label)}</td>" +
                    $"<td style=\"padding:10px 14px;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6\">{Encode(value)}</td>" +
                    "</tr>");
            }

            body.Append("</table>");
        }

        if (ButtonText is not null && ButtonUrl is not null)
        {
            body.Append(
                $"<p style=\"margin:24px 0\"><a href=\"{Encode(ButtonUrl)}\" " +
                $"style=\"display:inline-block;background:{BrandColor};color:#ffffff;text-decoration:none;" +
                $"padding:12px 24px;border-radius:8px;font-weight:600\">{Encode(ButtonText)}</a></p>" +
                "<p style=\"margin:0 0 16px;font-size:13px;color:#6b7280\">Se o botão não funcionar, copie e cole este endereço no navegador:<br>" +
                $"<span style=\"word-break:break-all\">{Encode(ButtonUrl)}</span></p>");
        }

        if (Note is not null)
            body.Append($"<p style=\"margin:16px 0 0;font-size:13px;color:#6b7280\">{Encode(Note)}</p>");

        return $"""
            <!doctype html>
            <html lang="pt-BR">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{Encode(Subject)}</title></head>
            <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px">
                <tr><td align="center">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
                    <tr><td style="background:{BrandColor};padding:20px 28px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px">MORAÊ</td></tr>
                    <tr><td style="padding:28px;font-size:15px;line-height:1.6">
                      <h1 style="margin:0 0 20px;font-size:20px">{Encode(Title)}</h1>
                      {body}
                    </td></tr>
                    <tr><td style="padding:16px 28px;background:#f9fafb;font-size:12px;color:#9ca3af">
                      Este é um e-mail automático do MORAÊ. Não é preciso respondê-lo.
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
    }

    private string BuildText()
    {
        var text = new StringBuilder();
        text.AppendLine(Title).AppendLine();

        if (Greeting is not null)
            text.AppendLine(Greeting).AppendLine();

        foreach (var paragraph in Paragraphs)
            text.AppendLine(paragraph).AppendLine();

        foreach (var (label, value) in Details)
            text.AppendLine($"{label}: {value}");

        if (Details.Count > 0)
            text.AppendLine();

        if (ButtonText is not null && ButtonUrl is not null)
            text.AppendLine($"{ButtonText}: {ButtonUrl}").AppendLine();

        if (Note is not null)
            text.AppendLine(Note).AppendLine();

        text.Append("— MORAÊ (e-mail automático, não é preciso responder)");
        return text.ToString();
    }

    private static string Encode(string value) => WebUtility.HtmlEncode(value);
}
