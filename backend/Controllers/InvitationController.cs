using System.Security.Claims;
using backend.Constants;
using backend.DTOs.Invitation;
using backend.Services.Invitations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvitationsController : ControllerBase
{
    private readonly IInvitationService _invitationService;

    public InvitationsController(IInvitationService invitationService)
    {
        _invitationService = invitationService;
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Master},{AppRoles.Admin}")]
    public async Task<IActionResult> Create([FromBody] CreateInvitationDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var invitation = await _invitationService.CreateAsync(userId, dto);

        return CreatedAtAction(nameof(GetByToken), new { token = invitation.Token }, invitation);
    }

    [HttpPost("{id:int}/renew")]
    [Authorize(Roles = $"{AppRoles.Master},{AppRoles.Admin}")]
    public async Task<IActionResult> Renew([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var invitation = await _invitationService.RenewAsync(userId, id);

        return Ok(invitation);
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = $"{AppRoles.Master},{AppRoles.Admin}")]
    public async Task<IActionResult> Cancel([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var invitation = await _invitationService.CancelAsync(userId, id);

        return Ok(invitation);
    }

    [HttpGet("/api/condominiums/{condominiumId}/invitations")]
    [Authorize(Roles = $"{AppRoles.Master},{AppRoles.Admin}")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var invitations = await _invitationService.GetByCondominiumAsync(userId, condominiumId);

        return Ok(invitations);
    }

    [HttpGet("{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetByToken([FromRoute] string token)
    {
        var invitation = await _invitationService.GetByTokenAsync(token);

        if (invitation is null)
            return NotFound();

        return Ok(invitation);
    }

    [HttpPost("accept")]
    [AllowAnonymous]
    public async Task<IActionResult> Accept([FromBody] AcceptInvitationDto dto)
    {
        await _invitationService.AcceptAsync(dto);

        return Ok(new
        {
            message = "Invitation accepted successfully."
        });
    }
}
