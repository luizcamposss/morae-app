using backend.Enums;

namespace backend.DTOs.Visit;

public class VisitResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int? UnitId { get; set; }
    // "Torre A, unidade 101", or null for a visit of the condominium.
    public string? UnitLabel { get; set; }
    public int? BuildingId { get; set; }
    public string VisitorName { get; set; } = string.Empty;
    public VisitorType VisitorType { get; set; }
    public string? DocumentLastDigits { get; set; }
    public string? CompanyName { get; set; }
    public string? Notes { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public List<int> DaysOfWeek { get; set; } = [];
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public VisitStatus Status { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    // Agenda only: the days of the requested period on which this visit happens.
    public List<DateOnly>? Dates { get; set; }
}
