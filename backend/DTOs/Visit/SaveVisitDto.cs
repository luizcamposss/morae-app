using backend.Enums;

namespace backend.DTOs.Visit;

// Create and edit. UnitId null = a visit of the condominium itself (management only).
public class SaveVisitDto
{
    public int? UnitId { get; set; }
    public string VisitorName { get; set; } = string.Empty;
    public VisitorType VisitorType { get; set; }
    public string? DocumentLastDigits { get; set; }
    public string? CompanyName { get; set; }
    public string? Notes { get; set; }
    public DateOnly? StartDate { get; set; }
    // Empty = same day as StartDate.
    public DateOnly? EndDate { get; set; }
    // 0 = Sunday ... 6 = Saturday. Empty = every day of the period.
    public List<int> DaysOfWeek { get; set; } = [];
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
}
