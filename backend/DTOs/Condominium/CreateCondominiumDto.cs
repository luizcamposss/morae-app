using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Condominium;

public class CreateCondominiumDto
{
    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(14)]
    public string CNPJ { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string Number { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [StringLength(2)]
    public string State { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string EmailContact { get; set; } = string.Empty;

}