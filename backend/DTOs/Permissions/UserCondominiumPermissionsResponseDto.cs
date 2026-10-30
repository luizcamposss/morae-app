namespace backend.DTOs.Permissions;

public class UserCondominiumPermissionsResponseDto
{
    public int UserId { get; set; }
    public int CondominiumId { get; set; }
    public string Role { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = [];
}
