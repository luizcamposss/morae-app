namespace backend.DTOs.Maintenance;

public class MaintenanceRecordResponseDto
{
    public int Id { get; set; }
    public int MaintenancePlanId { get; set; }
    public DateOnly PerformedOn { get; set; }
    public string? ProviderName { get; set; }
    public string? Notes { get; set; }
    public bool HasAttachment { get; set; }
    public string? AttachmentFileName { get; set; }
    public long? AttachmentSizeBytes { get; set; }
    public string RegisteredByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
