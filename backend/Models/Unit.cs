using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.Models;

public class Unit
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int BuildingId { get; set; }
    public Building Building { get; set; } = null!;

    [Required]
    [StringLength(20)]
    public string Number { get; set; } = string.Empty;

    [Required]
    public UnitType UnitType { get; set; }

    [Required]
    public int? Rooms { get; set; }

    [Required]
    public int? Bathrooms { get; set; }

    [Required]
    public double? SquareMeters { get; set; }
    public string Observations { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}