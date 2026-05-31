using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.Models;

public class PersonUnit
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int PersonId { get; set; }
    public Person Person { get; set; } = null!;

    [Required]
    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    [Required]
    public UnitRelationshipType RelationshipType { get; set; } = UnitRelationshipType.Undefined;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}