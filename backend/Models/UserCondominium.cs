using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.Models;

public class UserCondominium
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;
    public string Role { get; set; } = string.Empty;
    public ICollection<UserCondominiumPermission> Permissions { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public UserCondominiumStatus Status { get; set; } = UserCondominiumStatus.Active;
    public DateTime? SuspendedAt { get; set; }
    public int? SuspendedByUserId { get; set; }
    public ApplicationUser? SuspendedByUser { get; set; }
    public string? SuspensionReason { get; set; } = string.Empty;
}
