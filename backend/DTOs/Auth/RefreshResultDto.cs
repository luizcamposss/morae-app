namespace backend.DTOs.Auth;

public class RefreshResultDto
{
    public string AccessToken { get; set; } = string.Empty;

    // Null when the refresh token was not rotated (concurrent refresh within the grace window).
    public string? NewRefreshToken { get; set; }
}
