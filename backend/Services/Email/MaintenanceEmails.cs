using System.Globalization;

namespace backend.Services.Email;

public static class MaintenanceEmails
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public record Item(string Name, string? BuildingName, DateOnly DueDate, bool IsOverdue);

    // One summary per person per day, however many maintenances need attention.
    public static EmailTemplate Digest(string firstName, string condominiumName, IReadOnlyList<Item> items, string url)
    {
        var overdue = items.Count(item => item.IsOverdue);

        var subject = items.Count == 1
            ? $"Manutenção: {items[0].Name} {(items[0].IsOverdue ? "está atrasada" : "vence em breve")}"
            : $"{items.Count} manutenções precisam de atenção no {condominiumName}";

        var paragraphs = new List<string>
        {
            items.Count == 1
                ? $"Uma manutenção preventiva do {condominiumName} precisa de atenção."
                : $"{items.Count} manutenções preventivas do {condominiumName} precisam de atenção."
        };

        if (overdue > 0)
            paragraphs.Add("Manutenções obrigatórias atrasadas podem gerar multa e responsabilidade em caso de acidente.");

        return new EmailTemplate
        {
            Subject = subject,
            Title = "Manutenções preventivas",
            Greeting = $"Olá, {firstName}!",
            Paragraphs = paragraphs,
            Details = items
                .OrderBy(item => item.DueDate)
                .Select(item => (
                    item.BuildingName is null ? item.Name : $"{item.Name} ({item.BuildingName})",
                    item.IsOverdue
                        ? $"atrasada desde {item.DueDate.ToString("dd/MM/yyyy", PtBr)}"
                        : $"vence em {item.DueDate.ToString("dd/MM/yyyy", PtBr)}"))
                .ToList(),
            ButtonText = "Ver manutenções",
            ButtonUrl = url,
            Note = "Depois de feita, registre a execução no MORAÊ: a próxima data é calculada automaticamente."
        };
    }
}
