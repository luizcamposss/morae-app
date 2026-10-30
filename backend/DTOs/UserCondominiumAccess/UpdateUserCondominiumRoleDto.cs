using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.UserCondominiumAccess;

public class UpdateUserCondominiumRoleDto
{
    [Required]
    public string Role { get; set; } = string.Empty;
}
