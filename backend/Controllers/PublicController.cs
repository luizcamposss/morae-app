using backend.Constants;
using backend.DTOs.Public;
using backend.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace backend.Controllers;

// Open endpoints used by the landing page and the login (no account needed).
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    private readonly CommercialSettings _commercialSettings;

    public PublicController(IOptions<CommercialSettings> commercialSettings)
    {
        _commercialSettings = commercialSettings.Value;
    }

    [EnableRateLimiting(RateLimitPolicies.PublicInfo)]
    [HttpGet("commercial-contact")]
    public IActionResult GetCommercialContact()
    {
        var digits = new string(_commercialSettings.WhatsAppNumber.Where(char.IsDigit).ToArray());

        return Ok(new CommercialContactResponseDto
        {
            WhatsAppNumber = digits.Length == 0 ? null : digits
        });
    }
}
