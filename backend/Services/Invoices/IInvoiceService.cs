using backend.DTOs.Invoice;
using backend.Enums;

namespace backend.Services.Invoices;

public interface IInvoiceService
{
    Task<InvoiceMonthDto> GetMonthAsync(int userId, int condominiumId, string? month);
    Task<InvoiceResponseDto> AddItemAsync(int userId, int condominiumId, AddInvoiceItemDto dto);

    // "Lançar cobrança": the same item (or a value per unit) into the month's bill of several units.
    Task<LaunchChargeResultDto> LaunchAsync(int userId, int condominiumId, LaunchChargeDto dto);
    Task<InvoiceResponseDto> UpdateItemAsync(int userId, int itemId, UpdateInvoiceItemDto dto);
    Task DeleteItemAsync(int userId, int itemId);
    Task<InvoiceResponseDto> UpdateAsync(int userId, int chargeId, UpdateInvoiceDto dto);
    Task DeleteDraftAsync(int userId, int chargeId);
    Task<SendInvoicesResultDto> SendAsync(int userId, int condominiumId, SendInvoicesDto dto);

    // For rent contracts and meter readings: adds an item to the unit's draft bill of that month
    // (creating the draft if needed). No access check: callers check it.
    Task<InvoiceItemResult> AddItemToDraftAsync(InvoiceItemRequest request);

    // Removes an item whose bill is still a draft (a corrected meter reading). False when the bill
    // was already sent (the item can't change anymore). No access check: callers check it.
    Task<bool> RemoveDraftItemAsync(int itemId);

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
    DateTime? DueDate = null,
    // Who receives: null = the condominium; set = the unit owner (their rent, kept in a bill of its own).
    int? ReceiverPersonId = null,
    // A fixed monthly charge that put the item there (dedup per month).
    int? RecurringChargeId = null);

public record InvoiceItemResult(int ChargeId, int ItemId);
