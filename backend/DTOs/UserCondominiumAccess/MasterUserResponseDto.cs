using backend.Enums;

namespace backend.DTOs.UserCondominiumAccess;

public class MasterUserResponseDto
{
    public int UserId { get; set; }
    public int PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int CondominiumId { get; set; }
    public string CondominiumName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public UserCondominiumStatus Status { get; set; }
    public DateTime AccessCreatedAt { get; set; }
    public DateTime UserCreatedAt { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public string? SuspensionReason { get; set; }
}
