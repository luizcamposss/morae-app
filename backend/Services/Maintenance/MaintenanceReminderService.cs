using backend.Constants;
using backend.Data;
using backend.Enums;
using backend.Models;
using backend.Services.Email;
using backend.Services.Notifications;
using backend.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services.Maintenance;

// Called by the hourly job from 9h on. Warns the condominium's management 30 days before,
// 7 days before and once when overdue: one bell notification per maintenance and one
// summary e-mail per person.
public class MaintenanceReminderService : IMaintenanceReminderService
{
    private static readonly System.Globalization.CultureInfo PtBr = System.Globalization.CultureInfo.GetCultureInfo("pt-BR");

    private const int FirstReminderDays = 30;
    private const int SecondReminderDays = 7;

    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IEmailQueue _emailQueue;
    private readonly AppSettings _appSettings;
    private readonly ILogger<MaintenanceReminderService> _logger;

    public MaintenanceReminderService(
        AppDbContext context,
        INotificationService notificationService,
        IEmailQueue emailQueue,
        IOptions<AppSettings> appSettings,
        ILogger<MaintenanceReminderService> logger)
    {
        _context = context;
        _notificationService = notificationService;
        _emailQueue = emailQueue;
        _appSettings = appSettings.Value;
        _logger = logger;
    }

    private enum ReminderKind { FirstReminder, SecondReminder, Overdue }

    public async Task SendRemindersAsync(CancellationToken cancellationToken)
    {
        var today = MaintenancePlanService.Today();
        var firstLimit = today.AddDays(FirstReminderDays);
        // A plan created today was just typed in by a manager: reminders start tomorrow.
        var startOfTodayUtc = AppTimeZone.StartOfDayToUtc(AppTimeZone.Today);

        var plans = await _context.MaintenancePlans
            .Include(plan => plan.Building)
            .Where(plan =>
                plan.CreatedAt < startOfTodayUtc &&
                plan.Condominium.Status == Status.Active &&
                ((plan.NextDueDate < today && plan.OverdueReminderSentFor != plan.NextDueDate) ||
                 (plan.NextDueDate >= today && plan.NextDueDate <= firstLimit &&
                  (plan.Reminder30SentFor != plan.NextDueDate || plan.Reminder7SentFor != plan.NextDueDate))))
            .ToListAsync(cancellationToken);

        var reminders = plans
            .Select(plan => (Plan: plan, Kind: GetKind(plan, today)))
            .Where(item => item.Kind is not null)
            .Select(item => (item.Plan, Kind: item.Kind!.Value))
            .ToList();

        foreach (var condominium in reminders.GroupBy(item => item.Plan.CondominiumId))
        {
            await SendForCondominiumAsync(condominium.Key, condominium.ToList(), today, cancellationToken);
        }

        if (reminders.Count > 0)
            _logger.LogInformation("Sent reminders for {Count} maintenance plan(s).", reminders.Count);
    }

    private static ReminderKind? GetKind(MaintenancePlan plan, DateOnly today)
    {
        if (plan.NextDueDate < today)
            return plan.OverdueReminderSentFor != plan.NextDueDate ? ReminderKind.Overdue : null;

        if (plan.NextDueDate <= today.AddDays(SecondReminderDays))
            return plan.Reminder7SentFor != plan.NextDueDate ? ReminderKind.SecondReminder : null;

        return plan.Reminder30SentFor != plan.NextDueDate ? ReminderKind.FirstReminder : null;
    }

    private async Task SendForCondominiumAsync(
        int condominiumId,
        List<(MaintenancePlan Plan, ReminderKind Kind)> reminders,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var condominiumName = await _context.Condominiums
            .Where(condominium => condominium.Id == condominiumId)
            .Select(condominium => condominium.Name)
            .FirstAsync(cancellationToken);

        var managers = await GetManagersAsync(condominiumId, cancellationToken);
        var emailItems = new Dictionary<int, List<MaintenanceEmails.Item>>();

        foreach (var (plan, kind) in reminders)
        {
            var recipients = managers.Where(manager => manager.Sees(plan)).ToList();
            var label = plan.Building is null ? plan.Name : $"{plan.Name} ({plan.Building.Name})";
            var days = plan.NextDueDate.DayNumber - today.DayNumber;

            var (title, message) = kind switch
            {
                ReminderKind.Overdue => ("Manutenção atrasada",
                    $"{label} venceu em {plan.NextDueDate.ToString("dd/MM/yyyy", PtBr)}. Agende e registre a execução."),
                _ => ("Manutenção perto do vencimento",
                    $"{label} vence {(days == 0 ? "hoje" : days == 1 ? "amanhã" : $"em {days} dias")} ({plan.NextDueDate.ToString("dd/MM/yyyy", PtBr)}).")
            };

            foreach (var role in recipients.GroupBy(recipient => recipient.Role))
            {
                await _notificationService.CreateManyAsync(
                    role.Select(recipient => recipient.UserId),
                    NotificationType.System,
                    title,
                    message,
                    GetLink(role.Key),
                    condominiumId);
            }

            foreach (var recipient in recipients)
            {
                if (!emailItems.TryGetValue(recipient.UserId, out var items))
                    emailItems[recipient.UserId] = items = [];

                items.Add(new MaintenanceEmails.Item(
                    plan.Name, plan.Building?.Name, plan.NextDueDate, kind == ReminderKind.Overdue));
            }

            if (kind == ReminderKind.Overdue)
            {
                plan.OverdueReminderSentFor = plan.NextDueDate;
            }
            else
            {
                // The 7-day reminder also covers the 30-day one for this date.
                plan.Reminder30SentFor = plan.NextDueDate;

                if (kind == ReminderKind.SecondReminder)
                    plan.Reminder7SentFor = plan.NextDueDate;
            }
        }

        // Always e-mailed: these are legal obligations of the management.
        foreach (var manager in managers.Where(manager => emailItems.ContainsKey(manager.UserId)))
        {
            var email = MaintenanceEmails.Digest(
                manager.FirstName,
                condominiumName,
                emailItems[manager.UserId],
                _appSettings.BuildFrontendUrl(GetLink(manager.Role)));

            _emailQueue.Enqueue(email.ToMessage(manager.Email));
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    // Admins, and syndics with "maintenance.manage", with the buildings they manage.
    private async Task<List<Manager>> GetManagersAsync(int condominiumId, CancellationToken cancellationToken)
    {
        var rows = await _context.UserCondominiums
            .AsNoTracking()
            .Where(link =>
                link.CondominiumId == condominiumId &&
                link.Status == UserCondominiumStatus.Active &&
                link.User.Email != null &&
                (link.Role == AppRoles.Admin ||
                 (link.Role == AppRoles.Syndic &&
                  _context.UserCondominiumPermissions.Any(permission =>
                      permission.UserCondominiumId == link.Id &&
                      permission.PermissionKey == AppPermissions.MaintenanceManage))))
            .Select(link => new
            {
                link.UserId,
                link.Role,
                Email = link.User.Email!,
                link.User.Person.Name,
                AllBuildings = link.Role == AppRoles.Admin || link.ManagesAllBuildings,
                BuildingIds = link.Buildings.Select(building => building.BuildingId).ToList()
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(row => new Manager(
                row.UserId,
                row.Role,
                row.Email,
                string.IsNullOrWhiteSpace(row.Name) ? "gestor(a)" : row.Name.Trim().Split(' ')[0],
                row.AllBuildings,
                row.BuildingIds.ToHashSet()))
            .ToList();
    }

    private static string GetLink(string role)
    {
        return role == AppRoles.Admin ? "/admin/preventive-maintenance" : "/syndic/preventive-maintenance";
    }

    private record Manager(int UserId, string Role, string Email, string FirstName, bool AllBuildings, HashSet<int> BuildingIds)
    {
        // Same visibility as the maintenance list: condominium-wide plans and managed buildings.
        public bool Sees(MaintenancePlan plan) =>
            AllBuildings || plan.BuildingId is null || BuildingIds.Contains(plan.BuildingId.Value);
    }
}
