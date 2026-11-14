using System.Security.Claims;
using backend.DTOs.Expense;
using backend.Services.Expenses;
using backend.Services.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Expenses, their categories and the monthly balance ("prestação de contas").
[ApiController]
[Authorize]
[Route("api")]
public class ExpensesController : ControllerBase
{
    private const long UploadRequestLimitBytes = UploadedFileInspector.MaxFileSizeBytes + 5 * 1024 * 1024;

    private readonly IExpenseService _expenseService;

    public ExpensesController(IExpenseService expenseService)
    {
        _expenseService = expenseService;
    }

    [HttpGet("condominiums/{condominiumId}/expense-categories")]
    public async Task<IActionResult> GetCategories([FromRoute] int condominiumId)
    {
        return Ok(await _expenseService.GetCategoriesAsync(GetUserId(), condominiumId));
    }

    [HttpPost("condominiums/{condominiumId}/expense-categories")]
    public async Task<IActionResult> CreateCategory([FromRoute] int condominiumId, [FromBody] SaveExpenseCategoryDto dto)
    {
        var category = await _expenseService.CreateCategoryAsync(GetUserId(), condominiumId, dto);

        return StatusCode(StatusCodes.Status201Created, category);
    }

    [HttpPut("expense-categories/{id}")]
    public async Task<IActionResult> UpdateCategory([FromRoute] int id, [FromBody] SaveExpenseCategoryDto dto)
    {
        return Ok(await _expenseService.UpdateCategoryAsync(GetUserId(), id, dto));
    }

    [HttpDelete("expense-categories/{id}")]
    public async Task<IActionResult> DeleteCategory([FromRoute] int id)
    {
        await _expenseService.DeleteCategoryAsync(GetUserId(), id);

        return NoContent();
    }

    [HttpGet("condominiums/{condominiumId}/expenses")]
    public async Task<IActionResult> GetByMonth(
        [FromRoute] int condominiumId,
        [FromQuery] string? month,
        [FromQuery] int? categoryId)
    {
        return Ok(await _expenseService.GetByMonthAsync(GetUserId(), condominiumId, month, categoryId));
    }

    // multipart/form-data: categoryId, amount, paidOn, supplier, buildingId, description, file.
    [HttpPost("condominiums/{condominiumId}/expenses")]
    [RequestSizeLimit(UploadRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadRequestLimitBytes)]
    public async Task<IActionResult> Create([FromRoute] int condominiumId, [FromForm] SaveExpenseDto dto)
    {
        var expense = await _expenseService.CreateAsync(GetUserId(), condominiumId, dto);

        return StatusCode(StatusCodes.Status201Created, expense);
    }

    // Same fields as the creation, plus removeReceipt; a new file replaces the receipt.
    [HttpPut("expenses/{id}")]
    [RequestSizeLimit(UploadRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadRequestLimitBytes)]
    public async Task<IActionResult> Update([FromRoute] int id, [FromForm] SaveExpenseDto dto)
    {
        return Ok(await _expenseService.UpdateAsync(GetUserId(), id, dto));
    }

    [HttpDelete("expenses/{id}")]
    public async Task<IActionResult> Delete([FromRoute] int id)
    {
        await _expenseService.DeleteAsync(GetUserId(), id);

        return NoContent();
    }

    [HttpGet("expenses/{id}/receipt")]
    public async Task<IActionResult> DownloadReceipt([FromRoute] int id)
    {
        var download = await _expenseService.DownloadReceiptAsync(GetUserId(), id);

        // The browser must not guess another type from the content (e.g. run it as HTML).
        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpGet("condominiums/{condominiumId}/monthly-balance")]
    public async Task<IActionResult> GetMonthlyBalance([FromRoute] int condominiumId, [FromQuery] string? month)
    {
        return Ok(await _expenseService.GetMonthlyBalanceAsync(GetUserId(), condominiumId, month));
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
