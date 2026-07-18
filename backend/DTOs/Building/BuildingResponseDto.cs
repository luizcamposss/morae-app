using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.DTOs.Building;

public class BuildingResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int UnitCount { get; set; }
    public int ResidentCount { get; set; }
    public int OccupiedUnitCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
