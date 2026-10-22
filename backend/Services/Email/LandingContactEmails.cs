using System.Globalization;
using backend.Constants;
using backend.Models;
using backend.Services.LandingContacts;

namespace backend.Services.Email;

public static class LandingContactEmails
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    // Sent to every Master when someone fills in the landing page form.
    public static EmailTemplate NewContact(LandingContact contact)
    {
        var receivedAt = TimeZoneInfo.ConvertTimeFromUtc(contact.CreatedAt, AppTimeZone.SaoPaulo);
        var details = new List<(string Label, string Value)>
        {
            ("Nome", contact.Name),
            ("WhatsApp", LandingContactTexts.FormatWhatsApp(contact.WhatsApp)),
            ("Unidades", contact.UnitCount.ToString("N0", PtBr)),
            ("Perfil", LandingContactTexts.ProfileLabel(contact.Profile)),
            ("O que mais pesa", LandingContactTexts.PainLabel(contact.Pain) ?? "Não informado"),
            ("Recebido em", receivedAt.ToString("dd/MM/yyyy 'às' HH:mm", PtBr))
        };

        return new EmailTemplate
        {
            Subject = $"Novo contato da landing: {contact.Name}",
            Title = "Novo contato da landing",
            Greeting = "Olá!",
            Paragraphs =
            [
                $"{contact.Name} pediu para ver o Moraê funcionando. Chame no WhatsApp enquanto o interesse está quente."
            ],
            Details = details,
            ButtonText = "Chamar no WhatsApp",
            ButtonUrl = LandingContactTexts.BuildWhatsAppUrl(contact.WhatsApp, contact.Name, contact.Pain),
            Note = "O link já abre a conversa com uma mensagem pronta. Depois, atualize o status do contato na área do Master."
        };
    }
}
