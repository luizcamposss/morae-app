using AutoMapper;
using backend.Data;
using backend.DTOs.Notification;
using backend.Enums;
using backend.Exceptions;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Notifications;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public NotificationService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task CreateAsync(
        int userId,
        NotificationType type,
        string title,
        string message,
        string? linkUrl = null,
        int? condominiumId = null)
    {
        await CreateManyAsync([userId], type, title, message, linkUrl, condominiumId);
    }

    public async Task CreateManyAsync(
        IEnumerable<int> userIds,
        NotificationType type,
        string title,
        string message,
        string? linkUrl = null,
        int? condominiumId = null)
    {
        var distinctUserIds = userIds
            .Where(userId => userId > 0)
            .Distinct()
            .ToList();

        if (distinctUserIds.Count == 0)
            return;

        var existingUserIds = await _context.Users
            .AsNoTracking()
            .Where(user => distinctUserIds.Contains(user.Id))
            .Select(user => user.Id)
            .ToListAsync();

        if (existingUserIds.Count == 0)
            return;

        var preferences = await _context.UserNotificationPreferences
            .AsNoTracking()
            .Where(preference => existingUserIds.Contains(preference.UserId))
            .ToDictionaryAsync(preference => preference.UserId);

        var notifications = existingUserIds
            .Where(userId => ShouldNotify(preferences.GetValueOrDefault(userId), type))
            .Select(userId => new Notification
            {
                UserId = userId,
                Type = type,
                Title = title.Trim(),
                Message = message.Trim(),
                LinkUrl = string.IsNullOrWhiteSpace(linkUrl) ? null : linkUrl.Trim(),
                CondominiumId = condominiumId,
                CreatedAt = DateTime.UtcNow
            })
            .ToList();

        if (notifications.Count == 0)
            return;

        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetMineAsync(int userId)
    {
        var notifications = await _context.Notifications
            .AsNoTracking()
            .Where(notification => notification.UserId == userId)
            .OrderBy(notification => notification.ReadAt != null)
            .ThenByDescending(notification => notification.CreatedAt)
            .Take(50)
            .ToListAsync();

        return _mapper.Map<IEnumerable<NotificationResponseDto>>(notifications);
    }

    public async Task<NotificationResponseDto> MarkAsReadAsync(int userId, int notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(item =>
                item.Id == notificationId &&
                item.UserId == userId);

        if (notification is null)
            throw new NotFoundException("Notification not found.");

        notification.ReadAt ??= DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return _mapper.Map<NotificationResponseDto>(notification);
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var notifications = await _context.Notifications
            .Where(notification =>
                notification.UserId == userId &&
                notification.ReadAt == null)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    public async Task ClearAllAsync(int userId)
    {
        var notifications = await _context.Notifications
            .Where(notification => notification.UserId == userId)
            .ToListAsync();

        _context.Notifications.RemoveRange(notifications);
        await _context.SaveChangesAsync();
    }

    private static bool ShouldNotify(
        UserNotificationPreference? preference,
        NotificationType type)
    {
        if (preference is null)
            return true;

        return type switch
        {
            NotificationType.Charge or NotificationType.Payment => preference.BillsEnabled,
            NotificationType.Access or NotificationType.Occurrence => preference.UnitUpdatesEnabled,
            NotificationType.Invitation or NotificationType.News or NotificationType.System => preference.NoticesEnabled,
            _ => true
        };
    }
}
