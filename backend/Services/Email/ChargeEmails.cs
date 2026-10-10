using System.Globalization;
using backend.Constants;
using backend.Enums;

namespace backend.Services.Email;

public static class ChargeEmails
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public static EmailTemplate NewCharge(
        string firstName,
        bool isPlatformCharge,
        string condominiumName,
        string? unitLabel,
        string description,
        decimal value,
        DateTime dueDate,
        string chargesUrl)
    {
        var intro = isPlatformCharge
            ? $"Há uma nova cobrança da plataforma MORAÊ para o {condominiumName}."
            : $"Foi gerada uma nova cobrança para a sua unidade{(unitLabel is null ? "" : $" ({unitLabel})")} no {condominiumName}.";

        return new EmailTemplate
        {
            Subject = $"Nova cobrança: {description}",
            Title = "Nova cobrança disponível",
            Greeting = $"Olá, {firstName}!",
            Paragraphs = [intro],
            Details =
            [
                ("Descrição", description),
                ("Valor", value.ToString("C", PtBr)),
                // DueDate is a calendar date (no time zone conversion).
                ("Vencimento", dueDate.ToString("dd/MM/yyyy", PtBr))
            ],
            ButtonText = "Ver e pagar",
            ButtonUrl = chargesUrl,
            Note = "Você pode pagar por Pix, cartão ou boleto direto no MORAÊ. " +
                   "Para não receber estes avisos por e-mail, desligue \"Lembretes de boletos\" nas configurações."
        };
    }

    public static EmailTemplate PaymentConfirmed(
        string firstName,
        string condominiumName,
        string description,
        decimal amountPaid,
        PaymentMethod paymentMethod,
        DateTime paidAtUtc,
        string chargesUrl)
    {
        var paidAt = TimeZoneInfo.ConvertTimeFromUtc(paidAtUtc, AppTimeZone.SaoPaulo);

        return new EmailTemplate
        {
            Subject = $"Pagamento confirmado: {description}",
            Title = "Pagamento confirmado",
            Greeting = $"Olá, {firstName}!",
            Paragraphs = [$"Recebemos o pagamento da cobrança abaixo, do {condominiumName}. Obrigado!"],
            Details =
            [
                ("Descrição", description),
                ("Valor pago", amountPaid.ToString("C", PtBr)),
                ("Forma de pagamento", GetPaymentMethodLabel(paymentMethod)),
                ("Pago em", paidAt.ToString("dd/MM/yyyy 'às' HH:mm", PtBr))
            ],
            ButtonText = "Ver comprovante",
            ButtonUrl = chargesUrl,
            Note = "O comprovante completo fica disponível no MORAÊ, na lista de cobranças."
        };
    }

    public static EmailTemplate DueSoonReminder(
        string firstName,
        string condominiumName,
        string description,
        decimal value,
        DateTime dueDate,
        int daysLeft,
        string chargesUrl)
    {
        var when = daysLeft switch
        {
            0 => "vence hoje",
            1 => "vence amanhã",
            _ => $"vence em {daysLeft} dias"
        };

        return new EmailTemplate
        {
            Subject = $"Lembrete: {description} {when}",
            Title = $"Sua cobrança {when}",
            Greeting = $"Olá, {firstName}!",
            Paragraphs = [$"Este é um lembrete de que a cobrança abaixo, do {condominiumName}, {when}."],
            Details =
            [
                ("Descrição", description),
                ("Valor", value.ToString("C", PtBr)),
                ("Vencimento", dueDate.ToString("dd/MM/yyyy", PtBr))
            ],
            ButtonText = "Pagar agora",
            ButtonUrl = chargesUrl,
            Note = "Se você já pagou, desconsidere este aviso. " +
                   "Para não receber lembretes por e-mail, desligue \"Lembretes de boletos\" nas configurações."
        };
    }

    public static EmailTemplate OverdueReminder(
        string firstName,
        string condominiumName,
        string description,
        decimal value,
        DateTime dueDate,
        string chargesUrl)
    {
        return new EmailTemplate
        {
            Subject = $"Cobrança vencida: {description}",
            Title = "Sua cobrança venceu",
            Greeting = $"Olá, {firstName}!",
            Paragraphs =
            [
                $"Não identificamos o pagamento da cobrança abaixo, do {condominiumName}, que venceu em {dueDate.ToString("dd/MM/yyyy", PtBr)}.",
                "Você ainda pode pagar pelo MORAÊ, por Pix, cartão ou boleto."
            ],
            Details =
            [
                ("Descrição", description),
                ("Valor", value.ToString("C", PtBr)),
                ("Vencimento", dueDate.ToString("dd/MM/yyyy", PtBr))
            ],
            ButtonText = "Pagar agora",
            ButtonUrl = chargesUrl,
            Note = "Se você já pagou, desconsidere este aviso; a confirmação pode levar alguns instantes. " +
                   "Para não receber lembretes por e-mail, desligue \"Lembretes de boletos\" nas configurações."
        };
    }

    private static string GetPaymentMethodLabel(PaymentMethod paymentMethod)
    {
        return paymentMethod switch
        {
            PaymentMethod.Pix => "Pix",
            PaymentMethod.CreditCard => "Cartão de crédito",
            PaymentMethod.DebitCard => "Cartão de débito",
            PaymentMethod.BankSlip => "Boleto",
            PaymentMethod.BankTransfer => "Transferência bancária",
            PaymentMethod.AccountBalance => "Saldo em conta",
            PaymentMethod.PrepaidCard => "Cartão pré-pago",
            PaymentMethod.DigitalWallet => "Carteira digital",
            _ => "Outro"
        };
    }
}
