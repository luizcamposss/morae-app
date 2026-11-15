using System.Security.Claims;
using backend.DTOs.Reservation;
using backend.Enums;
using backend.Services.Reservations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Common areas (management and residents) and their reservations.
[ApiController]
[Authorize]
public class ReservationsController : ControllerBase
{
    // One photo of up to 10 MB plus the multipart overhead.
    private const long PhotoRequestLimitBytes = CommonAreaService.MaxPhotoSizeBytes + 1024 * 1024;

    private readonly ICommonAreaService _commonAreaService;
    private readonly IReservationService _reservationService;

    public ReservationsController(ICommonAreaService commonAreaService, IReservationService reservationService)
    {
        _commonAreaService = commonAreaService;
        _reservationService = reservationService;
    }

    // Management: every area of the condominium (inactive too), with the pending requests count.
    [HttpGet("api/condominiums/{condominiumId}/common-areas")]
    public async Task<IActionResult> GetAreas([FromRoute] int condominiumId)
    {
        return Ok(await _commonAreaService.GetForManagementAsync(GetUserId(), condominiumId));
    }

    // Residents: the active areas their units can book.
    [HttpGet("api/condominiums/{condominiumId}/common-areas/bookable")]
    public async Task<IActionResult> GetBookableAreas([FromRoute] int condominiumId)
    {
        return Ok(await _commonAreaService.GetBookableAsync(GetUserId(), condominiumId));
    }

    [HttpPost("api/condominiums/{condominiumId}/common-areas")]
    public async Task<IActionResult> CreateArea([FromRoute] int condominiumId, [FromBody] SaveCommonAreaDto dto)
    {
        var area = await _commonAreaService.CreateAsync(GetUserId(), condominiumId, dto);

        return StatusCode(StatusCodes.Status201Created, area);
    }

    [HttpPut("api/common-areas/{id}")]
    public async Task<IActionResult> UpdateArea([FromRoute] int id, [FromBody] SaveCommonAreaDto dto)
    {
        return Ok(await _commonAreaService.UpdateAsync(GetUserId(), id, dto));
    }

    [HttpDelete("api/common-areas/{id}")]
    public async Task<IActionResult> DeleteArea([FromRoute] int id)
    {
        await _commonAreaService.DeleteAsync(GetUserId(), id);

        return NoContent();
    }

    [HttpPut("api/common-areas/{id}/photo")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(PhotoRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = PhotoRequestLimitBytes)]
    public async Task<IActionResult> UploadPhoto([FromRoute] int id, IFormFile? file)
    {
        return Ok(await _commonAreaService.UploadPhotoAsync(GetUserId(), id, file));
    }

    [HttpDelete("api/common-areas/{id}/photo")]
    public async Task<IActionResult> DeletePhoto([FromRoute] int id)
    {
        return Ok(await _commonAreaService.DeletePhotoAsync(GetUserId(), id));
    }

    [HttpGet("api/common-areas/{id}/photo")]
    public async Task<IActionResult> DownloadPhoto([FromRoute] int id)
    {
        var download = await _commonAreaService.DownloadPhotoAsync(GetUserId(), id);

        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(download.Content, download.ContentType, download.FileName);
    }

    // The area's slots of one month ("yyyy-MM"; default = this month) for one of the user's units.
    [HttpGet("api/common-areas/{id}/availability")]
    public async Task<IActionResult> GetAvailability([FromRoute] int id, [FromQuery] string? month, [FromQuery] int? unitId)
    {
        return Ok(await _reservationService.GetAvailabilityAsync(GetUserId(), id, month, unitId));
    }

    [HttpPost("api/condominiums/{condominiumId}/reservations")]
    public async Task<IActionResult> Create([FromRoute] int condominiumId, [FromBody] CreateReservationDto dto)
    {
        var reservation = await _reservationService.CreateAsync(GetUserId(), condominiumId, dto);

        return StatusCode(StatusCodes.Status201Created, reservation);
    }

    // Reservations of the user's units; without includePast, only from today on.
    [HttpGet("api/condominiums/{condominiumId}/my-reservations")]
    public async Task<IActionResult> GetMine([FromRoute] int condominiumId, [FromQuery] bool includePast = false)
    {
        return Ok(await _reservationService.GetMineAsync(GetUserId(), condominiumId, includePast));
    }

    // Management list; default period: from today, one year ahead (up to 1 year per request).
    [HttpGet("api/condominiums/{condominiumId}/reservations")]
    public async Task<IActionResult> GetForManagement(
        [FromRoute] int condominiumId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] ReservationStatus? status,
        [FromQuery] int? commonAreaId)
    {
        return Ok(await _reservationService.GetForManagementAsync(GetUserId(), condominiumId, from, to, status, commonAreaId));
    }

    [HttpPost("api/reservations/{id}/approve")]
    public async Task<IActionResult> Approve([FromRoute] int id)
    {
        return Ok(await _reservationService.ApproveAsync(GetUserId(), id));
    }

    [HttpPost("api/reservations/{id}/reject")]
    public async Task<IActionResult> Reject([FromRoute] int id, [FromBody] RejectReservationDto dto)
    {
        return Ok(await _reservationService.RejectAsync(GetUserId(), id, dto));
    }

    [HttpPost("api/reservations/{id}/cancel")]
    public async Task<IActionResult> Cancel([FromRoute] int id, [FromBody] CancelReservationDto? dto)
    {
        return Ok(await _reservationService.CancelAsync(GetUserId(), id, dto ?? new CancelReservationDto()));
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
