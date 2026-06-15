using System.Security.Claims;
using backend.Services.Condominium;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/my/condominiums")]
[Authorize]
public class MyCondominiumsController : ControllerBase
{
    private readonly ICondominiumService _condominiumService;

    public MyCondominiumsController(ICondominiumService condominiumService)
    {
        _condominiumService = condominiumService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var condominiums = await _condominiumService.GetMineAsync(userId);

        return Ok(condominiums);
    }
}
