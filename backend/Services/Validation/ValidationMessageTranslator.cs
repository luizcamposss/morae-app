using System.Text.RegularExpressions;

namespace backend.Services.Validation;

// Translates the default (English) DataAnnotations and model binding messages into Portuguese.
// Custom ErrorMessage values set on the DTOs are already in Portuguese and pass through unchanged.
public static partial class ValidationMessageTranslator
{
    private const string Fallback = "Revise os dados informados.";

    private static readonly Dictionary<string, string> FieldLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Address"] = "endereço",
        ["AmountPaid"] = "valor pago",
        ["Bathrooms"] = "banheiros",
        ["BuildingType"] = "tipo do prédio",
        ["CEP"] = "CEP",
        ["ZipCode"] = "CEP",
        ["CNPJ"] = "CNPJ",
        ["CPF"] = "CPF",
        ["City"] = "cidade",
        ["Code"] = "código",
        ["Description"] = "descrição",
        ["DueDate"] = "vencimento",
        ["Email"] = "e-mail",
        ["EmailContact"] = "e-mail de contato",
        ["FederalUnit"] = "UF",
        ["State"] = "UF",
        ["FirstName"] = "nome",
        ["LastName"] = "sobrenome",
        ["FloorCount"] = "andares",
        ["Identification"] = "identificação",
        ["Name"] = "nome",
        ["Neighborhood"] = "bairro",
        ["Notes"] = "observações",
        ["Observations"] = "observações",
        ["Number"] = "número",
        ["StreetNumber"] = "número",
        ["StreetName"] = "rua",
        ["Password"] = "senha",
        ["PaymentMethod"] = "forma de pagamento",
        ["PhoneNumber"] = "telefone",
        ["PixKey"] = "chave Pix",
        ["Priority"] = "prioridade",
        ["Reason"] = "motivo",
        ["SuspensionReason"] = "motivo",
        ["RelationshipType"] = "vínculo",
        ["Role"] = "papel",
        ["Rooms"] = "quartos",
        ["SquareMeters"] = "metragem",
        ["Status"] = "status",
        ["TargetAudience"] = "público",
        ["Title"] = "título",
        ["Type"] = "tipo",
        ["UnitType"] = "tipo da unidade",
        ["Value"] = "valor",
    };

    public static string Translate(string field, string message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return Fallback;

        var label = GetLabel(field);

        if (RequiredRegex().IsMatch(message))
            return label is null ? Fallback : $"Preencha o campo {label}.";

        var length = LengthRegex().Match(message);
        if (length.Success)
        {
            var max = length.Groups["max"].Value;
            var min = length.Groups["min"].Value;
            var subject = label is null ? "Um dos campos" : $"O campo {label}";
            return string.IsNullOrEmpty(min)
                ? $"{subject} aceita até {max} caracteres."
                : $"{subject} precisa ter entre {min} e {max} caracteres.";
        }

        var range = RangeRegex().Match(message);
        if (range.Success)
        {
            var subject = label is null ? "Um dos valores" : $"O campo {label}";
            return $"{subject} precisa estar entre {range.Groups["min"].Value} e {range.Groups["max"].Value}.";
        }

        if (EmailRegex().IsMatch(message))
            return "Informe um e-mail válido.";

        if (PatternRegex().IsMatch(message))
            return label is null ? Fallback : $"O campo {label} está em um formato inválido.";

        // Model binding and JSON errors ("The JSON value could not be converted…", "A non-empty request body is required.").
        if (message.StartsWith("The ", StringComparison.Ordinal) || message.StartsWith("A ", StringComparison.Ordinal)
            || message.Contains("JSON", StringComparison.Ordinal) || message.Contains("is invalid", StringComparison.Ordinal))
            return Fallback;

        return message;
    }

    private static string? GetLabel(string field)
    {
        // "dto.PhoneNumber" or "$.phoneNumber" → "PhoneNumber"
        var name = field.Split('.', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? field;
        return FieldLabels.TryGetValue(name.TrimStart('$'), out var label) ? label : null;
    }

    [GeneratedRegex(@"^The .+ field is required\.$")]
    private static partial Regex RequiredRegex();

    [GeneratedRegex(@"^The field .+ must be a string(?: or array type)? with a (?:minimum length of (?<min>\d+) and a )?maximum length of (?<max>\d+)\.$")]
    private static partial Regex LengthRegex();

    [GeneratedRegex(@"^The field .+ must be between (?<min>\S+) and (?<max>\S+)\.$")]
    private static partial Regex RangeRegex();

    [GeneratedRegex(@"^The .+ field is not a valid e-mail address\.$")]
    private static partial Regex EmailRegex();

    [GeneratedRegex(@"^The field .+ must match the regular expression")]
    private static partial Regex PatternRegex();
}
