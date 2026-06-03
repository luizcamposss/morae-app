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

    public int PersonId { get; set; }

    public string PersonName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public UserRole Role { get; set; }
    public string Token { get; set; } = string.Empty;

    public InvitationStatus InvitationStatus { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }
}