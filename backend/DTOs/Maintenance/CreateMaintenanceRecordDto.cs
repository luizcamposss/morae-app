namespace backend.DTOs.Maintenance;

// Sent as multipart/form-data; the file is optional.
public class CreateMaintenanceRecordDto
{
    public DateOnly? PerformedOn { get; set; }
    public string? ProviderName { get; set; }
    public string? Notes { get; set; }
    public IFormFile? File { get; set; }
}
