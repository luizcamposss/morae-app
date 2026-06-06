using System.Security.Claims;
using backend.Constants;
using backend.DTOs.Person;
using backend.Services.Persons;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[Controller]")]
[Authorize]
public class PersonsController : ControllerBase
{
    private readonly IPersonService _personService;

    public PersonsController(IPersonService personService)
    {
        _personService = personService;
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Create([FromBody] CreatePersonDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var person = await _personService.CreateAsync(userId, null, dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = person.Id },
            person);
    }

    [HttpPost("/api/condominiums/{condominiumId}/persons")]
    [Authorize(Roles = $"{AppRoles.Master},{AppRoles.Admin}")]
    public async Task<IActionResult> CreateInCondominium([FromRoute] int condominiumId, [FromBody] CreatePersonDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var person = await _personService.CreateAsync(userId, condominiumId, dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = person.Id },
            person);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var persons = await _personService.GetAllAsync(userId);

        return Ok(persons);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var person = await _personService.GetByIdAsync(userId, id);

        if (person is null)
            return NotFound();

        return Ok(person);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Update(
        [FromRoute] int id,
        [FromBody] UpdatePersonDto dto)
    {
        var updated = await _personService.UpdateAsync(id, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Master)]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        var deleted = await _personService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
