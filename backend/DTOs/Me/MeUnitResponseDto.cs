using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Me;

public class MeUnitResponseDto
{
    public int UnitId { get; set; }
    public int BuildingId { get; set; }
    public int CondominiumId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public string CondominiumName { get; set; } = string.Empty;
    public UnitType UnitType { get; set; }
    public UnitRelationshipType RelationshipType { get; set; }
}