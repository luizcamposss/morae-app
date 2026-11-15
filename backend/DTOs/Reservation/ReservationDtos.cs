using backend.Enums;

namespace backend.DTOs.Reservation;

public class CreateReservationDto
{
    public int CommonAreaId { get; set; }
    public int UnitId { get; set; }
    public DateOnly? Date { get; set; }
    // Required when the area is booked by shift.
    public int? ShiftId { get; set; }
    // Must be true when the area has terms of use.
    public bool AcceptTerms { get; set; }
    public string? Notes { get; set; }
}

public class RejectReservationDto
{
    public string Reason { get; set; } = string.Empty;
}

public class CancelReservationDto
{
    public string? Reason { get; set; }
}

public class ReservationResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int CommonAreaId { get; set; }
    public string CommonAreaName { get; set; } = string.Empty;
    public int UnitId { get; set; }
    // "Torre A, unidade 101".
    public string UnitLabel { get; set; } = string.Empty;
    public int BuildingId { get; set; }
    public DateOnly Date { get; set; }
    public int? ShiftId { get; set; }
    public string ShiftName { get; set; } = string.Empty;
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public ReservationStatus Status { get; set; }
    public string? Notes { get; set; }
    public decimal? Fee { get; set; }
    public int? ChargeId { get; set; }
    public ChargeStatus? ChargeStatus { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? CanceledAt { get; set; }
    public string? CancelReason { get; set; }
    // Last day to cancel and have the fee canceled too (null = no fee or no deadline).
    public DateOnly? FreeCancellationUntil { get; set; }
    // Pending or approved, today or later.
    public bool CanCancel { get; set; }
}
