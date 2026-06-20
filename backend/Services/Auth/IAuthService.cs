using backend.DTOs;
using backend.DTOs.Auth;
using backend.Models;

namespace backend.Services.Auth;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<string> GenerateJwtToken(ApplicationUser user);
}