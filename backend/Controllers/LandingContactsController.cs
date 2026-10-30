using System.Security.Claims;
using backend.Constants;
using backend.DTOs.LandingContact;
using backend.Enums;
using backend.Services.LandingContacts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace backend.Controllers;

// Landing page leads: the public form and the Master's follow-up screen.
[ApiController]
[Authorize]
public class LandingContactsController : ControllerBase
{
    private readonly ILandingContactService _landingContactService;

    public LandingContactsController(ILandingContactService landingContactService)
    {
        _landingContactService = landingContactService;
    }

    // Same answer whether the contact is new or a repeat of the last 24 hours.
    [EnableRateLimiting(RateLimitPolicies.LandingContact)]
    [HttpPost("api/public/contacts")]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] CreateLandingContactDto dto)
    {
        await _landingContactService.CreateAsync(dto);

        return Ok(new
        {
            message = "Recebemos seu contato. Vamos te chamar no WhatsApp em breve."
        });
    }

    [HttpGet("api/landing-contacts")]
    // Taken as a number so an unknown status gets the service's Portuguese message, not the model-binding error.
    public async Task<IActionResult> GetAll([FromQuery] int? status)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var contacts = await _landingContactService.GetAllAsync(userId, (LandingContactStatus?)status);

        return Ok(contacts);
    }

    [HttpPatch("api/landing-contacts/{id:int}/status")]
    public async Task<IActionResult> UpdateStatus([FromRoute] int id, [FromBody] UpdateLandingContactStatusDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var contact = await _landingContactService.UpdateStatusAsync(userId, id, dto);

        return Ok(contact);
    }
}
