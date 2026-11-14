using backend.Data;
using backend.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Agreements;

// Keeps an agreement's status in step with its installments. Static on the DbContext so the
// payment paths (manual, Mercado Pago, refunds) can call it without depending on AgreementService.
public static class AgreementProgress
{
    // Active + every installment paid = Completed; a refund on a completed agreement reopens it.
    public static async Task SyncAsync(AppDbContext context, int? agreementId)
    {
        if (!agreementId.HasValue)
            return;

        var agreement = await context.Agreements.FirstOrDefaultAsync(a => a.Id == agreementId.Value);

        if (agreement is null || agreement.Status is AgreementStatus.Broken or AgreementStatus.Canceled)
            return;

        var allPaid = !await context.Charges.AnyAsync(c =>
            c.AgreementId == agreement.Id && c.Status != ChargeStatus.Paid);

        if (agreement.Status == AgreementStatus.Active && allPaid)
        {
            agreement.Status = AgreementStatus.Completed;
            agreement.EndedAt = DateTime.UtcNow;
        }
        else if (agreement.Status == AgreementStatus.Completed && !allPaid)
        {
            agreement.Status = AgreementStatus.Active;
            agreement.EndedAt = null;
        }
        else
        {
            return;
        }

        await context.SaveChangesAsync();
    }
}
