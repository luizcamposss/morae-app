using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Unit;

public class UnitResponseDto
{
    public int Id { get; set; }
    public int BuildingId { get; set; }
    public string Number { get; set; } = string.Empty;
    public UnitType UnitType { get; set; }    
    public int Rooms { get; set; }
    public int Bathrooms { get; set; }
    public double SquareMeters { get; set; }
    public string Observations { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}