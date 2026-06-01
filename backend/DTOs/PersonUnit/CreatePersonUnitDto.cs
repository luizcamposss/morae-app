using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.PersonUnit;

public class CreatePersonUnitDto
{
    [Required]
    public int PersonId { get; set; }

    [Required]
    public UnitRelationshipType RelationshipType { get; set; }
}