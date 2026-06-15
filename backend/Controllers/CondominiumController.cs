using System.Security.Claims;
using backend.Constants;
using backend.DTOs.Condominium;
using backend.Services.Condominium;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = AppRoles.Master)]
public class CondominiumController : ControllerBase
{
    private readonly ICondominiumService _condominium;

    public CondominiumController(ICondominiumService condominium)
    {
        _condominium = condominium;
    }

    [HttpPost("onboarding")]
    public async Task<IActionResult> Onboard([FromBody] CreateCondominiumOnboardingDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var condominium = await _condominium.OnboardAsync(userId, dto);

        return CreatedAtAction(nameof(GetById), new { id = condominium.Id }, condominium);

    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCondominiumDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var condominium = await _condominium.CreateAsync(userId, dto);

        return CreatedAtAction(nameof(GetById), new { id = condominium.Id }, condominium);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var condominiums = await _condominium.GetAllAsync(userId);

        return Ok(condominiums);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var condominium = await _condominium.GetByIdAsync(userId, id);

        if (condominium is null)
            return NotFound();

        return Ok(condominium);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCondominiumDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var updated = await _condominium.UpdateAsync(userId, id, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var deleted = await _condominium.DeleteAsync(userId, id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}