using backend.Enums;

namespace backend.Services.LandingContacts;

// Words shown for a landing contact (Master e-mail and screen) and the ready WhatsApp link.
public static class LandingContactTexts
{
    // Same ids as PainId in frontend/src/features/landing/landingContent.ts.
    private static readonly Dictionary<string, string> Pains = new(StringComparer.Ordinal)
    {
        ["inadimplencia"] = "Inadimplência",
        ["avisos"] = "Avisos no WhatsApp",
        ["sistema"] = "Sistema antigo",
        ["assembleia"] = "Assembleia vazia",
        ["migrar"] = "Medo de migrar",
    };

    public static bool IsKnownPain(string pain) => Pains.ContainsKey(pain);

    public static string? PainLabel(string? pain) =>
        pain is not null && Pains.TryGetValue(pain, out var label) ? label : null;

    public static string ProfileLabel(LandingContactProfileType profile) => profile switch
    {
        LandingContactProfileType.Administrator => "Administrador(a) de condomínios",
        LandingContactProfileType.Syndic => "Síndico(a)",
        _ => "Não informado"
    };

    // "5511999998888" -> "+55 (11) 99999-8888". Numbers from other countries stay as "+<digits>".
    public static string FormatWhatsApp(string digits)
    {
        if (digits.StartsWith("55") && digits.Length is 12 or 13)
        {
            var area = digits[2..4];
            var number = digits[4..];
            var split = number.Length - 4;
            return $"+55 ({area}) {number[..split]}-{number[split..]}";
        }

        return $"+{digits}";
    }

    public static string BuildWhatsAppUrl(string digits, string name, string? pain)
    {
        var firstName = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? name;
        var painLabel = PainLabel(pain);

        var message = painLabel is null
            ? $"Olá, {firstName}! Aqui é do Moraê. Vi que você pediu para ver o Moraê funcionando. Podemos conversar?"
            : $"Olá, {firstName}! Aqui é do Moraê. Vi que você pediu para ver o Moraê funcionando e que o que mais pesa hoje é \"{painLabel}\". Podemos conversar?";

        return $"https://wa.me/{digits}?text={Uri.EscapeDataString(message)}";
    }
}
