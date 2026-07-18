using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Invitation;

public class InvitationResponseDto
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }

    public string CondominiumName { get; set; } = string.Empty;

    public int PersonId { get; set; }

    public string PersonName { get; set; } = string.Empty;

    public int CreatedByUserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public UserRole Role { get; set; }
    public string RoleName { get; set; } = string.Empty;

    public string Token { get; set; } = string.Empty;

    public InvitationStatus InvitationStatus { get; set; }
    public string StatusName { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime? AcceptedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
