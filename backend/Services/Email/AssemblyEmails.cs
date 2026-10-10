using System.Globalization;
using backend.Constants;
using backend.Enums;

namespace backend.Services.Email;

public static class AssemblyEmails
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public static EmailTemplate Convocation(
        string firstName,
        string condominiumName,
        string title,
        AssemblyType type,
        DateTime votingStartsAtUtc,
        DateTime votingEndsAtUtc,
        DateTime? meetingAtUtc,
        string? meetingLocation,
        IReadOnlyList<string> itemTitles,
        string url)
    {
        var details = new List<(string, string)>
        {
            ("Tipo", type == AssemblyType.Ordinary ? "Assembleia Geral Ordinária" : "Assembleia Geral Extraordinária"),
            ("Votação online", $"de {Format(votingStartsAtUtc)} até {Format(votingEndsAtUtc)}")
        };

        if (meetingAtUtc.HasValue)
            details.Add(("Reunião", $"{Format(meetingAtUtc.Value)}{(string.IsNullOrWhiteSpace(meetingLocation) ? "" : $" — {meetingLocation}")}"));

        for (var index = 0; index < itemTitles.Count; index++)
            details.Add(($"Pauta {index + 1}", itemTitles[index]));

        return new EmailTemplate
        {
            Subject = $"Convocação: {title}",
            Title = "Convocação para assembleia",
            Greeting = $"Olá, {firstName}!",
            Paragraphs =
            [
                $"O {condominiumName} convoca os condôminos para a assembleia \"{title}\".",
                "Você pode votar pelo Moraê durante o período de votação, sem precisar ir à reunião."
            ],
            Details = details,
            ButtonText = "Ver assembleia",
            ButtonUrl = url,
            Note = "Só vota quem tem direito pela convenção e está em dia com o condomínio. Um voto por unidade."
        };
    }

    public static EmailTemplate Canceled(string firstName, string condominiumName, string title, string reason, string url)
    {
        return new EmailTemplate
        {
            Subject = $"Assembleia cancelada: {title}",
            Title = "Assembleia cancelada",
            Greeting = $"Olá, {firstName}!",
            Paragraphs =
            [
                $"A assembleia \"{title}\" do {condominiumName} foi cancelada.",
                $"Motivo: {reason}"
            ],
            ButtonText = "Ver assembleias",
            ButtonUrl = url
        };
    }

    public static EmailTemplate ClosingReminder(string firstName, string condominiumName, string title, DateTime votingEndsAtUtc, string url)
    {
        return new EmailTemplate
        {
            Subject = $"Últimas horas para votar: {title}",
            Title = "A votação está terminando",
            Greeting = $"Olá, {firstName}!",
            Paragraphs =
            [
                $"A votação da assembleia \"{title}\" do {condominiumName} termina em {Format(votingEndsAtUtc)}, e a sua unidade ainda não votou em todas as pautas.",
                "Seu voto ajuda o condomínio a decidir com a participação de todos."
            ],
            ButtonText = "Votar agora",
            ButtonUrl = url
        };
    }

    private static string Format(DateTime utc)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(utc, AppTimeZone.SaoPaulo);
        return local.ToString("dd/MM/yyyy 'às' HH:mm", PtBr);
    }
}
