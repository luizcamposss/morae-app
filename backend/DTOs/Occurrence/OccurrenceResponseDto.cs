using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Occurrence;

public class OccurrenceResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int UnitId { get; set; }
    public int CreatedByUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public OccurrenceType Type { get; set; }
    public OccurrenceStatus Status { get; set; }
    public OccurrencePriority Priority { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public int BuildingId { get; set; }
    public string BuildingName { get; set; } = string.Empty;
    public string UnitNumber { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public string? ManagementResponse { get; set; }
    public DateTime? RespondedAt { get; set; }
    public string? RespondedByName { get; set; }
    public List<OccurrencePhotoDto> Photos { get; set; } = [];
}
