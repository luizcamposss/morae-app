using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class UserNotificationPreference
{
    [Key]
    public int Id { get; set; }

    public int UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    public bool NoticesEnabled { get; set; } = true;
    public bool BillsEnabled { get; set; } = true;
    public bool UnitUpdatesEnabled { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
