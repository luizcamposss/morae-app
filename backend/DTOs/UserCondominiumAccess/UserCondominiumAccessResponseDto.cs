using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.UserCondominiumAccess;

public class UserCondominiumAccessResponseDto
{
    public int UserId { get; set; }
    public int CondominiumId { get; set; }
    public string Role { get; set; } = string.Empty;
    public UserCondominiumStatus Status { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public int? SuspendedByUserId { get; set; }
    public string? SuspensionReason { get; set; }
}