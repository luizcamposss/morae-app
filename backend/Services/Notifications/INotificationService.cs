using backend.DTOs.Notification;
using backend.Enums;

namespace backend.Services.Notifications;

public interface INotificationService
{
    Task CreateAsync(
        int userId,
        NotificationType type,
        string title,
        string message,
        string? linkUrl = null,
        int? condominiumId = null);

    Task CreateManyAsync(
        IEnumerable<int> userIds,
        NotificationType type,
        string title,
        string message,
        string? linkUrl = null,
        int? condominiumId = null);

    Task<IEnumerable<NotificationResponseDto>> GetMineAsync(int userId);
    Task<NotificationResponseDto> MarkAsReadAsync(int userId, int notificationId);
    Task MarkAllAsReadAsync(int userId);
    Task ClearAllAsync(int userId);
}
