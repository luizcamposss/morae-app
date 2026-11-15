using System.Security.Claims;
using backend.Services.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/condominiums/{condominiumId}/reports")]
// Financial reports of the management, downloaded as Excel or PDF.
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("{type}")]
    public async Task<IActionResult> Download(
        [FromRoute] int condominiumId,
        [FromRoute] string type,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] int? buildingId,
        [FromQuery] string format = "xlsx")
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await _reportService.GenerateAsync(userId, condominiumId, type, from, to, buildingId, format);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(report.Content, report.ContentType, report.FileName);
    }
}
