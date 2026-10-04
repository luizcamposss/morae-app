using backend.DTOs;
using backend.DTOs.Auth;
using backend.Models;

namespace backend.Services.Auth;

public interface IAuthService
{
    Task<(AuthResponseDto Response, string? RefreshToken)> LoginAsync(LoginDto dto);
    Task<RefreshResultDto?> RefreshAsync(string refreshToken);
    Task RevokeAsync(string refreshToken);
    Task RevokeAllAsync(int userId);
    int GetRefreshTokenDays();
    Task<string> GenerateJwtToken(ApplicationUser user);
}