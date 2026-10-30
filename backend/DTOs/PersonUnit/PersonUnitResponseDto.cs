using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.PersonUnit;

public class PersonUnitResponseDto
{
    public int Id { get; set; }

    public int PersonId { get; set; }

    public string PersonName { get; set; } = string.Empty;

    public int UnitId { get; set; }

    public string UnitNumber { get; set; } = string.Empty;

    public UnitRelationshipType RelationshipType { get; set; }

    public DateTime CreatedAt { get; set; }
}