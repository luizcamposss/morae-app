using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Me;

public class UpdateMyProfileDto
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{10,20}$", ErrorMessage = "Phone number must contain between 10 and 20 digits.")]
    public string PhoneNumber { get; set; } = string.Empty;
}
