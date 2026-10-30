using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class UserCondominiumPermission
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserCondominiumId { get; set; }

    public UserCondominium UserCondominium { get; set; } = null!;

    [Required]
    [StringLength(100)]
    public string PermissionKey { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
