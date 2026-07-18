using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Unit;

public class CreateUnitDto
{
    [Required]
    [StringLength(20, MinimumLength = 1)]
    public string Number { get; set; } = string.Empty;

    [Required]
    [Range(1, 6)]
    public UnitType UnitType { get; set; }

    [Required]
    [Range(0, 20)]
    public int Rooms { get; set; }

    [Required]
    [Range(0, 20)]
    public int Bathrooms { get; set; }

    [Required]
    [Range(0, 10000)]
    public double SquareMeters { get; set; }

    [StringLength(500)]
    public string Observations { get; set; } = string.Empty;
}
