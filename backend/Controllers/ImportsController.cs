using System.Security.Claims;
using backend.Services.Imports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Spreadsheet import (Admin of the condominium): download the template, preview, confirm.
// Preview and confirm receive the same file (multipart/form-data, field "file"): nothing is kept
// between the two calls, and confirm validates everything again before saving.
[ApiController]
[Authorize]
public class ImportsController : ControllerBase
{
    // 1 MB of room above the 2 MB file limit, so a slightly larger file gets a clear message.
    private const long UploadRequestLimitBytes = SpreadsheetImportService.MaxFileSizeBytes + 1024 * 1024;

    private readonly ISpreadsheetImportService _importService;

    public ImportsController(ISpreadsheetImportService importService)
    {
        _importService = importService;
    }

    [HttpGet("api/condominiums/{condominiumId}/imports/template")]
    public async Task<IActionResult> Template([FromRoute] int condominiumId, [FromQuery] string format = "csv")
    {
        var template = await _importService.GetTemplateAsync(GetUserId(), condominiumId, format);

        return File(template.Content, template.ContentType, template.FileName);
    }

    [HttpPost("api/condominiums/{condominiumId}/imports/preview")]
    [RequestSizeLimit(UploadRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadRequestLimitBytes)]
    public async Task<IActionResult> Preview([FromRoute] int condominiumId, IFormFile? file)
    {
        return Ok(await _importService.PreviewAsync(GetUserId(), condominiumId, file));
    }

    [HttpPost("api/condominiums/{condominiumId}/imports/confirm")]
    [RequestSizeLimit(UploadRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadRequestLimitBytes)]
    public async Task<IActionResult> Confirm([FromRoute] int condominiumId, IFormFile? file)
    {
        return Ok(await _importService.ConfirmAsync(GetUserId(), condominiumId, file));
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
