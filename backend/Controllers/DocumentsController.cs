using System.Security.Claims;
using backend.DTOs.Document;
using backend.Enums;
using backend.Services.Documents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
public class DocumentsController : ControllerBase
{
    private const long UploadRequestLimitBytes = DocumentService.MaxFileSizeBytes + 5 * 1024 * 1024;

    private readonly IDocumentService _documentService;

    public DocumentsController(IDocumentService documentService)
    {
        _documentService = documentService;
    }

    // multipart/form-data: file, title, description, category, visibility.
    // The request limit leaves 5 MB of room above the 20 MB file limit, so a slightly larger file
    // still arrives and gets a clear message instead of a dropped connection.
    [HttpPost("api/condominiums/{condominiumId}/documents")]
    [RequestSizeLimit(UploadRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadRequestLimitBytes)]
    public async Task<IActionResult> Create([FromRoute] int condominiumId, [FromForm] CreateDocumentDto dto)
    {
        var document = await _documentService.CreateAsync(GetUserId(), condominiumId, dto);

        return StatusCode(StatusCodes.Status201Created, document);
    }

    [HttpGet("api/condominiums/{condominiumId}/documents")]
    public async Task<IActionResult> GetByCondominium(
        [FromRoute] int condominiumId,
        [FromQuery] DocumentCategory? category)
    {
        return Ok(await _documentService.GetByCondominiumAsync(GetUserId(), condominiumId, category));
    }

    [HttpGet("api/documents/{id}/download")]
    public async Task<IActionResult> Download([FromRoute] int id)
    {
        var download = await _documentService.DownloadAsync(GetUserId(), id);

        // The browser must not guess another type from the content (e.g. run it as HTML).
        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpPut("api/documents/{id}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateDocumentDto dto)
    {
        return Ok(await _documentService.UpdateAsync(GetUserId(), id, dto));
    }

    [HttpDelete("api/documents/{id}")]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        await _documentService.DeleteAsync(GetUserId(), id);

        return NoContent();
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
