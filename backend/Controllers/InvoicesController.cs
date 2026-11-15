using System.Security.Claims;
using backend.DTOs.Invoice;
using backend.Services.Invoices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// Monthly bills ("Contas do mês"): drafts put together by the management, then sent to the payers.
[ApiController]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpGet("api/condominiums/{condominiumId}/invoices")]
    public async Task<IActionResult> GetMonth([FromRoute] int condominiumId, [FromQuery] string? month)
    {
        return Ok(await _invoiceService.GetMonthAsync(GetUserId(), condominiumId, month));
    }

    [HttpPost("api/condominiums/{condominiumId}/invoices/items")]
    public async Task<IActionResult> AddItem([FromRoute] int condominiumId, [FromBody] AddInvoiceItemDto dto)
    {
        return Ok(await _invoiceService.AddItemAsync(GetUserId(), condominiumId, dto));
    }

    [HttpPost("api/condominiums/{condominiumId}/invoices/launch")]
    public async Task<IActionResult> Launch([FromRoute] int condominiumId, [FromBody] LaunchChargeDto dto)
    {
        return Ok(await _invoiceService.LaunchAsync(GetUserId(), condominiumId, dto));
    }

    [HttpPost("api/condominiums/{condominiumId}/invoices/send")]
    public async Task<IActionResult> Send([FromRoute] int condominiumId, [FromBody] SendInvoicesDto dto)
    {
        return Ok(await _invoiceService.SendAsync(GetUserId(), condominiumId, dto));
    }

    [HttpPut("api/invoices/{chargeId}")]
    public async Task<IActionResult> Update([FromRoute] int chargeId, [FromBody] UpdateInvoiceDto dto)
    {
        return Ok(await _invoiceService.UpdateAsync(GetUserId(), chargeId, dto));
    }

    [HttpDelete("api/invoices/{chargeId}")]
    public async Task<IActionResult> Delete([FromRoute] int chargeId)
    {
        await _invoiceService.DeleteDraftAsync(GetUserId(), chargeId);
        return NoContent();
    }

    [HttpPut("api/invoice-items/{itemId}")]
    public async Task<IActionResult> UpdateItem([FromRoute] int itemId, [FromBody] UpdateInvoiceItemDto dto)
    {
        return Ok(await _invoiceService.UpdateItemAsync(GetUserId(), itemId, dto));
    }

    [HttpDelete("api/invoice-items/{itemId}")]
    public async Task<IActionResult> DeleteItem([FromRoute] int itemId)
    {
        await _invoiceService.DeleteItemAsync(GetUserId(), itemId);
        return NoContent();
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
