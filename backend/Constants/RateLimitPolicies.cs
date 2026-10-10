namespace backend.Constants;

// Per-IP request limits for endpoints open to anonymous callers (see Program.cs).
public static class RateLimitPolicies
{
    public const string Login = "login";               // 10/min
    public const string Refresh = "refresh";           // 30/min
    public const string Invitation = "invitation";     // 10/min (view / accept)
    public const string PasswordReset = "password-reset"; // 5/min (ask for a reset link)
    public const string PasswordResetConfirm = "password-reset-confirm"; // 10/min (set the new password)
    public const string Webhook = "webhook";           // 120/min (Mercado Pago bursts)
}
