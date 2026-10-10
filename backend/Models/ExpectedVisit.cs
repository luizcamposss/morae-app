using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// Someone from outside expected at the condominium: announced by a resident for their unit,
// or by the management for the condominium itself (UnitId null: common areas, condo services).
public class ExpectedVisit
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int? UnitId { get; set; }
    public Unit? Unit { get; set; }

    [Required]
    [StringLength(100)]
    public string VisitorName { get; set; } = string.Empty;

    public VisitorType VisitorType { get; set; }

    // Only the last 4 characters of the visitor's ID (LGPD: no full documents of third parties).
    [StringLength(4)]
    public string? DocumentLastDigits { get; set; }

    [StringLength(100)]
    public string? CompanyName { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    // A single day (StartDate == EndDate) or a period. DaysOfWeekMask limits the period to some
    // weekdays (bit 0 = Sunday ... bit 6 = Saturday); 0 = every day of the period.
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int DaysOfWeekMask { get; set; }

    // Optional time window (both or neither).
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }

    public VisitStatus Status { get; set; } = VisitStatus.Active;
    public DateTime? CanceledAt { get; set; }

    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
