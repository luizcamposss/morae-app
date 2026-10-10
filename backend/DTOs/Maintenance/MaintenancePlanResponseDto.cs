using backend.Enums;

namespace backend.DTOs.Maintenance;

public class MaintenancePlanResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int? BuildingId { get; set; }
    public string? BuildingName { get; set; }
    public string Name { get; set; } = string.Empty;
    public MaintenanceCategory Category { get; set; }
    public int IntervalMonths { get; set; }
    public DateOnly NextDueDate { get; set; }
    public MaintenanceStatus Status { get; set; }
    // Negative when overdue.
    public int DaysUntilDue { get; set; }
    public DateOnly? LastPerformedOn { get; set; }
    public string? ProviderName { get; set; }
    public string? ProviderPhone { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
