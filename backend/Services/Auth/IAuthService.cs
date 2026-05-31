using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs;
using backend.DTOs.Auth;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<string> GenerateJwtToken(ApplicationUser user);
}