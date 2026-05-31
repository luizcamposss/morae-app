using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using backend.Constants;
using backend.DTOs.Condominium;
using backend.Services.Condominium;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize]
public class CondominiumController : ControllerBase
{
    private readonly ICondominiumService _condominium;

    public CondominiumController(ICondominiumService condominium)
    {
        _condominium = condominium;
    }
    [HttpPost]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Create(CreateCondominiumDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var condominium = await _condominium.CreateAsync(dto, userId);

        return CreatedAtAction(
            nameof(GetById),
            new { id = condominium.Id },
            condominium);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var condominiums = await _condominium.GetAllAsync();
        return Ok(condominiums);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var condominium = await _condominium.GetByIdAsync(id);

        if (condominium == null)
            return NotFound();

        return Ok(condominium);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Update(int id, UpdateCondominiumDto dto)
    {
        var updated = await _condominium.UpdateAsync(id, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _condominium.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
}
}