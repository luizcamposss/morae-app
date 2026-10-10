using System.ComponentModel.DataAnnotations;

namespace backend.Models;

// One time a preventive maintenance was done (the plan's history).
public class MaintenanceRecord
{
    public int Id { get; set; }

    public int MaintenancePlanId { get; set; }
    public MaintenancePlan MaintenancePlan { get; set; } = null!;

    public DateOnly PerformedOn { get; set; }

    // The plan's due date before this record, restored if the record is deleted.
    public DateOnly PreviousDueDate { get; set; }

    [StringLength(150)]
    public string? ProviderName { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    // Optional attachment (report, invoice, certificate) in the file storage.
    [StringLength(200)]
    public string? AttachmentFileName { get; set; }

    [StringLength(100)]
    public string? AttachmentContentType { get; set; }

    public long? AttachmentSizeBytes { get; set; }

    [StringLength(200)]
    public string? AttachmentStorageKey { get; set; }

    public int RegisteredByUserId { get; set; }
    public ApplicationUser RegisteredByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
