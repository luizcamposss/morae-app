using backend.Enums;

namespace backend.DTOs.Maintenance;

// Used to create and to edit a maintenance plan.
public class SaveMaintenancePlanDto
{
    public int? BuildingId { get; set; }
    public string Name { get; set; } = string.Empty;
    public MaintenanceCategory Category { get; set; }
    public int IntervalMonths { get; set; }
    public DateOnly? NextDueDate { get; set; }
    public string? ProviderName { get; set; }
    public string? ProviderPhone { get; set; }
    public string? Notes { get; set; }
}
