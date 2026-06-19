using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.News;

public class UpdateNewsDto
{
    public int? BuildingId { get; set; }

    [Required]
    [StringLength(100)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public NewsTargetAudience TargetAudience { get; set; }

    public Priority Priority { get; set; } = Priority.Undefined;
}