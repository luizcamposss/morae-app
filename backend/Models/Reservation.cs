using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

// A unit's booking of a common area on a date (and shift, unless the area is booked by the day).
public class Reservation
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int CommonAreaId { get; set; }
    public CommonArea CommonArea { get; set; } = null!;

    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    public DateOnly Date { get; set; }

    // Null when the area is booked by the day. Name and times are copied so editing the shift
    // later does not change reservations already made.
    public int? ShiftId { get; set; }
    public CommonAreaShift? Shift { get; set; }

    [Required]
    [StringLength(60)]
    public string ShiftName { get; set; } = string.Empty;

    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }

    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

    // "yyyy-MM-dd#shiftId" (0 = whole day) while pending or approved, null otherwise. Unique per
    // area, so two active reservations can never take the same slot, even at the same instant.
    [StringLength(40)]
    public string? SlotKey { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    // Fee copied from the area when requested, and the charge created for it on approval.
    public decimal? Fee { get; set; }
    public int? ChargeId { get; set; }
    public Charge? Charge { get; set; }

    public int RequestedByUserId { get; set; }
    public ApplicationUser RequestedByUser { get; set; } = null!;
    public DateTime? TermsAcceptedAt { get; set; }

    public int? DecidedByUserId { get; set; }
    public ApplicationUser? DecidedByUser { get; set; }
    public DateTime? DecidedAt { get; set; }

    [StringLength(500)]
    public string? RejectionReason { get; set; }

    public int? CanceledByUserId { get; set; }
    public ApplicationUser? CanceledByUser { get; set; }
    public DateTime? CanceledAt { get; set; }

    [StringLength(500)]
    public string? CancelReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
