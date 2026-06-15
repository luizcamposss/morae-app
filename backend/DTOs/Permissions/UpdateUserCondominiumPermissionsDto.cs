using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Permissions;

public class UpdateUserCondominiumPermissionsDto
{
    [Required]
    public List<string> Permissions { get; set; } = [];
}
