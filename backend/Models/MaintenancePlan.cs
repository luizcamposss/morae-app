using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// A recurring preventive maintenance of the condominium (e.g. "Elevator — monthly").
public class MaintenancePlan
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    // Null = the whole condominium.
    public int? BuildingId { get; set; }
    public Building? Building { get; set; }

    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    public MaintenanceCategory Category { get; set; }

    // Every how many months it must be done (1 = monthly, 12 = yearly).
    public int IntervalMonths { get; set; }

    // A calendar date (no time, no time zone).
    public DateOnly NextDueDate { get; set; }

    [StringLength(150)]
    public string? ProviderName { get; set; }

    [StringLength(20)]
    public string? ProviderPhone { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
