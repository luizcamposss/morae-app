using backend.Models;

namespace backend.Services.Email;

public interface IChargeEmailNotifier
{
    // Respects the "Lembretes de boletos" preference (BillsEnabled).
    Task QueueNewChargeAsync(Charge charge);

    // Always sent: it works as a receipt.
    Task QueuePaymentConfirmedAsync(Charge charge, Payment payment);

    // Daily reminders (respect BillsEnabled).
    Task QueueDueSoonReminderAsync(Charge charge, int daysLeft);
    Task QueueOverdueReminderAsync(Charge charge);

    // Users who pay this charge (same people who get its e-mails), for in-app notifications.
    Task<List<int>> GetPayerUserIdsAsync(Charge charge);
}
