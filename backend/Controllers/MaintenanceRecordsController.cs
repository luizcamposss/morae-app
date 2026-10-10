using System.Security.Claims;
using backend.DTOs.Maintenance;
using backend.Services.Maintenance;
using backend.Services.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class MaintenanceRecordsController : ControllerBase
{
    // 5 MB of room above the 20 MB file limit: a slightly larger file gets a clear message.
    private const long UploadRequestLimitBytes = UploadedFileInspector.MaxFileSizeBytes + 5 * 1024 * 1024;

    private readonly IMaintenancePlanService _maintenancePlanService;

    public MaintenanceRecordsController(IMaintenancePlanService maintenancePlanService)
    {
        _maintenancePlanService = maintenancePlanService;
    }

    // multipart/form-data: performedOn (yyyy-MM-dd), providerName, notes, file (optional).
    [HttpPost("api/maintenance-plans/{planId}/records")]
    [RequestSizeLimit(UploadRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadRequestLimitBytes)]
    public async Task<IActionResult> Create([FromRoute] int planId, [FromForm] CreateMaintenanceRecordDto dto)
    {
        var record = await _maintenancePlanService.CreateRecordAsync(GetUserId(), planId, dto);

        return StatusCode(StatusCodes.Status201Created, record);
    }

    [HttpGet("api/maintenance-plans/{planId}/records")]
    public async Task<IActionResult> GetByPlan([FromRoute] int planId)
    {
        return Ok(await _maintenancePlanService.GetRecordsAsync(GetUserId(), planId));
    }

    [HttpGet("api/maintenance-records/{id}/attachment")]
    public async Task<IActionResult> DownloadAttachment([FromRoute] int id)
    {
        var download = await _maintenancePlanService.DownloadAttachmentAsync(GetUserId(), id);

        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpDelete("api/maintenance-records/{id}")]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        await _maintenancePlanService.DeleteRecordAsync(GetUserId(), id);

        return NoContent();
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
