namespace backend.Services.Maintenance;

public interface IMaintenanceReminderService
{
    Task SendRemindersAsync(CancellationToken cancellationToken);
}
