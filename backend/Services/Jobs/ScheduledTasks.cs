using System.Globalization;
using backend.Constants;
using backend.Data;
using backend.Enums;
using backend.Models;
using backend.Services.Email;
using backend.Services.Maintenance;
using backend.Services.Notifications;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Jobs;

// The work behind ScheduledJobsService. Every task is idempotent: running it twice
// (restart, catch-up) changes nothing and sends nothing the second time.
public class ScheduledTasks : IScheduledTasks
{
    // Reminders go out from this São Paulo hour on, never during the night.
    private const int ReminderHour = 9;
    private const int DueSoonDays = 3;
    // On the first run, older overdue charges get no reminder (avoids e-mailing years of history).
    private const int OverdueReminderMaxDaysLate = 3;
    private const int ReadNotificationRetentionDays = 90;

    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private readonly AppDbContext _context;
    private readonly IChargeEmailNotifier _chargeEmailNotifier;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ScheduledTasks> _logger;
    private readonly IMaintenanceReminderService _maintenanceReminderService;

    public ScheduledTasks(
        AppDbContext context,
        IChargeEmailNotifier chargeEmailNotifier,
        INotificationService notificationService,
        ILogger<ScheduledTasks> logger,
        IMaintenanceReminderService maintenanceReminderService)
    {
        _maintenanceReminderService = maintenanceReminderService;
        _context = context;
        _chargeEmailNotifier = chargeEmailNotifier;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task RunAllAsync(CancellationToken cancellationToken)
    {
        // Each task runs on its own: one failure does not stop the others.
        await RunSafelyAsync("mark overdue charges", MarkOverdueChargesAsync, cancellationToken);
        await RunSafelyAsync("expire invitations", ExpireInvitationsAsync, cancellationToken);
        await RunSafelyAsync("clean up old data", CleanUpAsync, cancellationToken);

        var saoPauloNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, AppTimeZone.SaoPaulo);

        if (saoPauloNow.Hour >= ReminderHour)
        {
            await RunSafelyAsync("send due-soon reminders", SendDueSoonRemindersAsync, cancellationToken);
            await RunSafelyAsync("send overdue reminders", SendOverdueRemindersAsync, cancellationToken);
            await RunSafelyAsync("send maintenance reminders", _maintenanceReminderService.SendRemindersAsync, cancellationToken);
        }
    }

    private async Task MarkOverdueChargesAsync(CancellationToken cancellationToken)
    {
        // DueDate is a calendar date: overdue from the day after it, São Paulo time.
        var today = AppTimeZone.Today;

        var updated = await _context.Charges
            .Where(charge => charge.Status == ChargeStatus.Pending && charge.DueDate < today)
            .ExecuteUpdateAsync(setters => setters.SetProperty(charge => charge.Status, ChargeStatus.Overdue),
                cancellationToken);

        if (updated > 0)
            _logger.LogInformation("Marked {Count} charge(s) as overdue.", updated);
    }

    private async Task ExpireInvitationsAsync(CancellationToken cancellationToken)
    {
        var updated = await _context.Invitations
            .Where(invitation =>
                invitation.InvitationStatus == InvitationStatus.Pending &&
                invitation.ExpiresAt < DateTime.UtcNow)
            .ExecuteUpdateAsync(setters => setters.SetProperty(
                invitation => invitation.InvitationStatus, InvitationStatus.Expired), cancellationToken);

        if (updated > 0)
            _logger.LogInformation("Expired {Count} invitation(s).", updated);
    }

    private async Task CleanUpAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        // Expired sessions can never be used again (revoked ones are kept until they expire,
        // because reuse detection needs them).
        var refreshTokens = await _context.RefreshTokens
            .Where(token => token.ExpiresAt < now.AddDays(-1))
            .ExecuteDeleteAsync(cancellationToken);

        // Abandoned "connect Mercado Pago" attempts (they last 10 minutes).
        var oauthStates = await _context.MercadoPagoOAuthStates
            .Where(state => state.ExpiresAt < now.AddDays(-1))
            .ExecuteDeleteAsync(cancellationToken);

        // Old notifications already read; unread ones are never deleted.
        var notifications = await _context.Notifications
            .Where(notification =>
                notification.ReadAt != null &&
                notification.CreatedAt < now.AddDays(-ReadNotificationRetentionDays))
            .ExecuteDeleteAsync(cancellationToken);

        if (refreshTokens + oauthStates + notifications > 0)
        {
            _logger.LogInformation(
                "Cleanup removed {RefreshTokens} expired session(s), {OAuthStates} Mercado Pago connection attempt(s) " +
                "and {Notifications} old read notification(s).",
                refreshTokens, oauthStates, notifications);
        }
    }

    private async Task SendDueSoonRemindersAsync(CancellationToken cancellationToken)
    {
        var today = AppTimeZone.Today;
        var lastDay = today.AddDays(DueSoonDays);
        // A charge created today just got its "new charge" e-mail; it is reminded from tomorrow on.
        var startOfTodayUtc = AppTimeZone.StartOfDayToUtc(today);

        var charges = await _context.Charges
            .Where(charge =>
                charge.Status == ChargeStatus.Pending &&
                charge.DueSoonReminderSentAt == null &&
                charge.DueDate >= today &&
                charge.DueDate <= lastDay &&
                charge.CreatedAt < startOfTodayUtc)
            .ToListAsync(cancellationToken);

        foreach (var charge in charges)
        {
            var daysLeft = (charge.DueDate.Date - today).Days;
            var when = daysLeft switch
            {
                0 => "vence hoje",
                1 => "vence amanhã",
                _ => $"vence em {daysLeft} dias"
            };

            await _notificationService.CreateManyAsync(
                await _chargeEmailNotifier.GetPayerUserIdsAsync(charge),
                NotificationType.Charge,
                "Cobrança perto do vencimento",
                $"A cobrança \"{charge.Description}\" de {charge.Value.ToString("C", PtBr)} {when}.",
                GetChargesLink(charge),
                charge.CondominiumId);

            await _chargeEmailNotifier.QueueDueSoonReminderAsync(charge, daysLeft);

            // Saved per charge: if the run stops halfway, nothing already sent is sent again.
            charge.DueSoonReminderSentAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (charges.Count > 0)
            _logger.LogInformation("Sent due-soon reminders for {Count} charge(s).", charges.Count);
    }

    private async Task SendOverdueRemindersAsync(CancellationToken cancellationToken)
    {
        var today = AppTimeZone.Today;
        var oldestDueDate = today.AddDays(-OverdueReminderMaxDaysLate);

        var charges = await _context.Charges
            .Where(charge =>
                charge.Status == ChargeStatus.Overdue &&
                charge.OverdueReminderSentAt == null &&
                charge.DueDate < today &&
                charge.DueDate >= oldestDueDate)
            .ToListAsync(cancellationToken);

        foreach (var charge in charges)
        {
            await _notificationService.CreateManyAsync(
                await _chargeEmailNotifier.GetPayerUserIdsAsync(charge),
                NotificationType.Charge,
                "Cobrança vencida",
                $"A cobrança \"{charge.Description}\" de {charge.Value.ToString("C", PtBr)} venceu em " +
                $"{charge.DueDate.ToString("dd/MM/yyyy", PtBr)}. Você ainda pode pagar pelo MORAÊ.",
                GetChargesLink(charge),
                charge.CondominiumId);

            await _chargeEmailNotifier.QueueOverdueReminderAsync(charge);

            charge.OverdueReminderSentAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (charges.Count > 0)
            _logger.LogInformation("Sent overdue reminders for {Count} charge(s).", charges.Count);
    }

    private static string GetChargesLink(Charge charge)
    {
        return charge.Scope == ChargeScope.Platform ? "/admin/payments" : "/resident/bills";
    }

    private async Task RunSafelyAsync(
        string name,
        Func<CancellationToken, Task> task,
        CancellationToken cancellationToken)
    {
        try
        {
            await task(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "Scheduled task \"{Task}\" failed; it will run again in the next cycle.", name);
        }
    }
}
