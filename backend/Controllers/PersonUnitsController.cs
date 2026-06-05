using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Constants;
using backend.DTOs.PersonUnit;
using backend.Services.PersonUnits;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class PersonUnitsController : ControllerBase
{
    private readonly IPersonUnitService _personUnitService;

    public PersonUnitsController(IPersonUnitService personUnitService)
    {
        _personUnitService = personUnitService;
    }

    [HttpPost("api/units/{unitId}/persons")]
    [Authorize(Roles = $"{AppRoles.Admin}")]
    public async Task<IActionResult> Create([FromRoute] int unitId, [FromBody] CreatePersonUnitDto dto)
    {
        var personUnit = await _personUnitService.CreateAsync(unitId, dto);

        return Created($"api/person-units/{personUnit.Id}", personUnit);
    }
    
    [HttpGet("api/units/{unitId}/persons")]
    public async Task<IActionResult> GetByUnit([FromRoute] int unitId)
    {
        var people = await _personUnitService.GetByUnitAsync(unitId);

        return Ok(people);
    }

    [HttpDelete("api/person-units/{id}")]
    [Authorize(Roles = $"{AppRoles.Admin}")]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        var deleted = await _personUnitService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
