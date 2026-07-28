using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.UserCondominiumAccess;

public class CreateMasterUserDto
{
    [Required]
    public int CondominiumId { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(11)]
    public string CPF { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
