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
    [Authorize(Roles = $"{AppRoles.Master},{AppRoles.Admin}")]
    public async Task<IActionResult> Create([FromBody] CreatePersonDto dto)
    {
        var person = await _personService.CreateAsync(dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = person.Id },
            person);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var persons = await _personService.GetAllAsync();

        return Ok(persons);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var person = await _personService.GetByIdAsync(id);

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