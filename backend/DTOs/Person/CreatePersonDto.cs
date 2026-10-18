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
    [RegularExpression(@"^\d{11}$", ErrorMessage = "Informe um CPF válido com 11 números.")]
    public string CPF { get; set; } = string.Empty;

    // Optional; the format is only checked when it is filled in.
    [RegularExpression(@"^\d{10,20}$", ErrorMessage = "Informe um telefone válido com DDD.")]
    public string? PhoneNumber { get; set; }

    [StringLength(256)]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    public string? Email { get; set; }
}
