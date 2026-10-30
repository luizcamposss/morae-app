namespace backend.Services.Jobs;

public interface IScheduledTasks
{
    Task RunAllAsync(CancellationToken cancellationToken);
}
