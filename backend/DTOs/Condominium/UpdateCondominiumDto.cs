using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Condominium;

public class UpdateCondominiumDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string CEP { get; set; } = string.Empty;

    [Required]
    public string Number { get; set; } = string.Empty;

    [Required]
    public string Address { get; set; } = string.Empty;

    [Required]
    public string City { get; set; } = string.Empty;

    [Required]
    public string State { get; set; } = string.Empty;

    [Required]
    public string EmailContact { get; set; } = string.Empty;

    public Status Status { get; set; }
}