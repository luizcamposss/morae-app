namespace backend.DTOs.Auth;

public class ResetPasswordDto
{
    // The code from the e-mail link (/reset-password?token=...).
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
