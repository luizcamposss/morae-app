namespace backend.Services.Email;

public static class AccountEmails
{
    public static EmailTemplate PasswordReset(string name, string resetUrl) => new()
    {
        Subject = "Redefinição de senha do MORAÊ",
        Title = "Redefinir sua senha",
        Greeting = $"Olá, {name}!",
        Paragraphs =
        [
            "Recebemos um pedido para redefinir a senha da sua conta no MORAÊ.",
            "Clique no botão abaixo para criar uma nova senha. O link vale por 1 hora e só pode ser usado uma vez."
        ],
        ButtonText = "Criar nova senha",
        ButtonUrl = resetUrl,
        Note = "Se você não pediu isso, ignore este e-mail. Sua senha atual continua valendo."
    };

    public static EmailTemplate PasswordChanged(string name) => new()
    {
        Subject = "Sua senha do MORAÊ foi alterada",
        Title = "Senha alterada",
        Greeting = $"Olá, {name}!",
        Paragraphs =
        [
            "A senha da sua conta no MORAÊ acabou de ser alterada, e os outros aparelhos conectados foram desconectados."
        ],
        Note = "Se não foi você, use \"Esqueci minha senha\" na tela de login agora mesmo para recuperar o acesso."
    };
}
