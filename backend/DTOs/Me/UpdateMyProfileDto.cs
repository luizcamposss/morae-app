using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Me;

public class UpdateMyProfileDto
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{10,20}$", ErrorMessage = "Informe um telefone válido com DDD.")]
    public string PhoneNumber { get; set; } = string.Empty;
}
