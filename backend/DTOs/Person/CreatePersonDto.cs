using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace backend.DTOs.Person;

public class CreatePersonDto
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{11}$", ErrorMessage = "CPF must contain exactly 11 digits.")]
    public string CPF { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{10,20}$", ErrorMessage = "Phone number must contain between 10 and 20 digits.")]
    public string PhoneNumber { get; set; } = string.Empty;
}
