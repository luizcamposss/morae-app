using System.Security.Claims;
using backend.DTOs.FinancialAccount;
using backend.Services.FinancialAccounts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/financial-accounts")]
public class FinancialAccountsController : ControllerBase
{
    private readonly IFinancialAccountService _financialAccountService;

    public FinancialAccountsController(IFinancialAccountService financialAccountService)
    {
        _financialAccountService = financialAccountService;
    }

    [HttpGet("platform")]
    public async Task<IActionResult> GetPlatform()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var account = await _financialAccountService.GetPlatformAsync(userId);

        return Ok(account);
    }

    [HttpPut("platform")]
    public async Task<IActionResult> UpsertPlatform([FromBody] UpsertFinancialAccountDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var account = await _financialAccountService.UpsertPlatformAsync(userId, dto);

        return Ok(account);
    }

    [HttpGet("/api/condominiums/{condominiumId}/financial-account")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var account = await _financialAccountService.GetByCondominiumAsync(userId, condominiumId);

        return Ok(account);
    }

    [HttpPut("/api/condominiums/{condominiumId}/financial-account")]
    public async Task<IActionResult> UpsertByCondominium(
        [FromRoute] int condominiumId,
        [FromBody] UpsertFinancialAccountDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var account = await _financialAccountService.UpsertByCondominiumAsync(
            userId,
            condominiumId,
            dto);

        return Ok(account);
    }
}
