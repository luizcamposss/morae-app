using backend.Constants;
using backend.Enums;

namespace backend.Services.Email;

public static class InvitationEmails
{
    public static EmailTemplate Invitation(
        string personName,
        string inviterName,
        string condominiumName,
        UserRole role,
        DateTime expiresAtUtc,
        string acceptUrl)
    {
        var expiresAt = TimeZoneInfo.ConvertTimeFromUtc(expiresAtUtc, AppTimeZone.SaoPaulo);
        var firstName = personName.Trim().Split(' ')[0];

        // "Condomínio Jardins" already says what it is; "Jardins" needs the word in front.
        var condominium = condominiumName.StartsWith("condom", StringComparison.OrdinalIgnoreCase)
            ? condominiumName
            : $"condomínio {condominiumName}";

        var invitationLine = role switch
        {
            UserRole.Admin => $"{inviterName} convidou você para administrar o {condominium} no MORAÊ.",
            UserRole.Syndic => $"{inviterName} convidou você para ser síndico(a) do {condominium} no MORAÊ.",
            _ => $"{inviterName} convidou você para acessar o {condominium} no MORAÊ como morador(a)."
        };

        return new EmailTemplate
        {
            Subject = $"Convite para o {condominiumName} no MORAÊ",
            Title = "Você recebeu um convite",
            Greeting = $"Olá, {firstName}!",
            Paragraphs =
            [
                invitationLine,
                "Clique no botão abaixo para criar sua senha e ativar o seu acesso."
            ],
            ButtonText = "Aceitar convite",
            ButtonUrl = acceptUrl,
            Note = $"O convite vale até {expiresAt:dd/MM/yyyy} às {expiresAt:HH:mm}. " +
                   "Se você não esperava este convite, pode ignorar este e-mail."
        };
    }
}
