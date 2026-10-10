using backend.Models;

namespace backend.Services.Email;

public interface IChargeEmailNotifier
{
    // Respects the "Lembretes de boletos" preference (BillsEnabled).
    Task QueueNewChargeAsync(Charge charge);

    // Always sent: it works as a receipt.
    Task QueuePaymentConfirmedAsync(Charge charge, Payment payment);
}
