using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Unit;

public class UpdateUnitDto
{
    [Required]
    [StringLength(20)]
    public string Number { get; set; } = string.Empty;

    [Required]
    public UnitType UnitType { get; set; }

    [Required]
    public int Rooms { get; set; }

    [Required]
    public int Bathrooms { get; set; }

    [Required]
    public double SquareMeters { get; set; }
    public string Observations { get; set; } = string.Empty;
}