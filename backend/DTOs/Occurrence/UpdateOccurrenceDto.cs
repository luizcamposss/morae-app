using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Occurrence;

public class UpdateOccurrenceDto
{
    [Required]
    public OccurrenceStatus Status { get; set; }
}