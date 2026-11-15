using backend.DTOs.Invoice;
using backend.Enums;

namespace backend.Services.Invoices;

public interface IInvoiceService
{
    Task<InvoiceMonthDto> GetMonthAsync(int userId, int condominiumId, string? month);
    Task<InvoiceResponseDto> AddItemAsync(int userId, int condominiumId, AddInvoiceItemDto dto);
    Task<InvoiceResponseDto> UpdateItemAsync(int userId, int itemId, UpdateInvoiceItemDto dto);
    Task DeleteItemAsync(int userId, int itemId);
    Task<InvoiceResponseDto> UpdateAsync(int userId, int chargeId, UpdateInvoiceDto dto);
    Task DeleteDraftAsync(int userId, int chargeId);
    Task<SendInvoicesResultDto> SendAsync(int userId, int condominiumId, SendInvoicesDto dto);

    // For rent contracts and meter readings: adds an item to the unit's draft bill of that month
    // (creating the draft if needed). No access check: callers check it.
    Task<int> AddItemToDraftAsync(InvoiceItemRequest request);

    // Hourly job: sends the drafts whose condominium sends automatically and whose day came.
    Task SendDueDraftsAsync(CancellationToken cancellationToken);
}

public record InvoiceItemRequest(
    int CondominiumId,
    int UnitId,
    int? RecipientPersonId,
    DateOnly Month,
    ChargeCategory Category,
    string Description,
    decimal Amount,
    int CreatedByUserId,
    // Null = the condominium's due day in that month.
    DateTime? DueDate = null);
