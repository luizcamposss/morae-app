using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.DTOs.Occurrence;
using backend.Services.Occurrences;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class OccurrencesController : ControllerBase
{
    // Room for 5 photos of 10 MB plus the text fields.
    private const long UploadRequestLimitBytes = 55 * 1024 * 1024;

    private readonly IOccurrenceService _occurrenceService;

    public OccurrencesController(IOccurrenceService occurrenceService)
    {
        _occurrenceService = occurrenceService;
    }

    [HttpPost("api/occurrences")]
    [Consumes("application/json")]
    public async Task<IActionResult> Create([FromBody] CreateOccurrenceDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrence = await _occurrenceService.CreateAsync(userId, dto);

        return CreatedAtAction(
            nameof(GetById),
            new { id = occurrence.Id },
            occurrence);
    }

    // Same route, multipart/form-data: the JSON fields plus up to 5 "photos" (JPG or PNG).
    [HttpPost("api/occurrences")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(UploadRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadRequestLimitBytes)]
    public async Task<IActionResult> CreateWithPhotos(
        [FromForm] CreateOccurrenceDto dto,
        [FromForm] List<IFormFile>? photos)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrence = await _occurrenceService.CreateAsync(userId, dto, photos);

        return CreatedAtAction(
            nameof(GetById),
            new { id = occurrence.Id },
            occurrence);
    }

    [HttpGet("api/condominiums/{condominiumId}/occurrences")]
    public async Task<IActionResult> GetByCondominium([FromRoute] int condominiumId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrences = await _occurrenceService.GetByCondominiumAsync(userId, condominiumId);

        return Ok(occurrences);
    }

    [HttpGet("api/my/occurrences")]
    public async Task<IActionResult> GetMine()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrences = await _occurrenceService.GetMineAsync(userId);

        return Ok(occurrences);
    }

    [HttpGet("api/occurrences/{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var occurrence = await _occurrenceService.GetByIdAsync(userId, id);

        if (occurrence is null)
            return NotFound();

        return Ok(occurrence);
    }

    [HttpPut("api/occurrences/{id}/status")]
    public async Task<IActionResult> UpdateStatus(
        [FromRoute] int id,
        [FromBody] UpdateOccurrenceDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var updated = await _occurrenceService.UpdateStatusAsync(userId, id, dto);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpPut("api/occurrences/{id}/response")]
    public async Task<IActionResult> Respond(
        [FromRoute] int id,
        [FromBody] RespondOccurrenceDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        return Ok(await _occurrenceService.RespondAsync(userId, id, dto));
    }

    [HttpGet("api/occurrence-photos/{id}")]
    public async Task<IActionResult> DownloadPhoto([FromRoute] int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var download = await _occurrenceService.DownloadPhotoAsync(userId, id);

        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(download.Content, download.ContentType, download.FileName);
    }
}
