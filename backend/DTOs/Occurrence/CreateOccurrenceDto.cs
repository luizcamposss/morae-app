using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Occurrence;

public class CreateOccurrenceDto
{
    [Required]
    public int CondominiumId { get; set; }

    [Required]
    public int UnitId { get; set; }

    [Required]
    [StringLength(120)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public OccurrencePriority Priority { get; set; } = OccurrencePriority.Medium;
}