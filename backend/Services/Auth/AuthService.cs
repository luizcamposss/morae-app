using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using backend.Constants;
using backend.Data;
using backend.DTOs;
using backend.DTOs.Auth;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;
    private readonly IMapper _mapper;
    public AuthService(AppDbContext context, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, IConfiguration configuration, IMapper mapper)
    {
        _context = context;
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _mapper = mapper;
    }
    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var roleExists = new[]
        {
            AppRoles.Master,
            AppRoles.Admin,
            AppRoles.Syndic,
            AppRoles.Resident,
        }.Contains(dto.Role);

        if (!roleExists)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Role is invalid"
            };
        }

        var emailAlreadyExists = await _userManager.FindByEmailAsync(dto.Email);

        if (emailAlreadyExists is not null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Email is already registered"
            };
        }

        var cpfExists = await _context.Persons
            .AnyAsync(p => p.CPF == dto.CPF);

        if (cpfExists)
            throw new Exception("CPF already registered.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var person = _mapper.Map<Person>(dto);

        _context.Persons.Add(person);
        await _context.SaveChangesAsync();

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            PersonId = person.Id
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = string.Join(" | ", result.Errors.Select(e => e.Description))
            };
        }

        var roleResult = await _userManager.AddToRoleAsync(user, dto.Role);

        if (!roleResult.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = string.Join(" | ", roleResult.Errors.Select(e => e.Description))
            };
        }

        await transaction.CommitAsync();

        return new AuthResponseDto
        {
            Success = true,
            Message = "Usuário cadastrado com sucesso."
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);

        if (user is null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "E-mail ou senha inválidos."
            };
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, false);

        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "E-mail ou senha inválidos."
            };
        }

        var token = await GenerateJwtToken(user);

        return new AuthResponseDto
        {
            Success = true,
            Message = "Login realizado com sucesso.",
            Token = token
        };
    }
    public async Task<string> GenerateJwtToken(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.Name, user.UserName ?? string.Empty)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]!)
        );

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var expiresInMinutes = int.Parse(
            _configuration["Jwt:ExpiresInMinutes"] ?? "60"
        );

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresInMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
