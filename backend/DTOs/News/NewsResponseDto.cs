using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.News;

public class NewsResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public NewsScope Scope { get; set; }
    public int? CondominiumId { get; set; }
    public int? BuildingId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public NewsTargetAudience TargetAudience { get; set; }
    public Priority Priority { get; set; }
    public DateTime CreatedAt { get; set; }
}