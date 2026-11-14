namespace backend.DTOs.Reservation;

// Create and edit an area. Shifts are ignored when FullDay; an existing shift keeps its Id.
public class SaveCommonAreaDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? Capacity { get; set; }
    // Null = the whole condominium.
    public int? BuildingId { get; set; }
    public bool IsActive { get; set; } = true;
    public bool FullDay { get; set; }
    public List<SaveCommonAreaShiftDto> Shifts { get; set; } = [];
    public int MinAdvanceDays { get; set; }
    public int MaxAdvanceDays { get; set; } = 90;
    public int? MonthlyLimitPerUnit { get; set; }
    public bool RequiresApproval { get; set; }
    public decimal? Fee { get; set; }
    public int? FreeCancellationDays { get; set; }
    public string? Terms { get; set; }
}

public class SaveCommonAreaShiftDto
{
    public int? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
}

public class CommonAreaShiftDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
}

public class CommonAreaResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public int? BuildingId { get; set; }
    public string? BuildingName { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? Capacity { get; set; }
    public bool IsActive { get; set; }
    public bool FullDay { get; set; }
    public List<CommonAreaShiftDto> Shifts { get; set; } = [];
    public int MinAdvanceDays { get; set; }
    public int MaxAdvanceDays { get; set; }
    public int? MonthlyLimitPerUnit { get; set; }
    public bool RequiresApproval { get; set; }
    public decimal? Fee { get; set; }
    public int? FreeCancellationDays { get; set; }
    public string? Terms { get; set; }
    public bool HasPhoto { get; set; }
    // Management list only: requests waiting for a decision.
    public int PendingCount { get; set; }
}

// One month of an area for the resident's calendar.
public class CommonAreaAvailabilityDto
{
    public int CommonAreaId { get; set; }
    public int UnitId { get; set; }
    // First and last day that can be booked today (advance rules).
    public DateOnly FirstBookableDate { get; set; }
    public DateOnly LastBookableDate { get; set; }
    public int? MonthlyLimitPerUnit { get; set; }
    // The unit's active reservations of this area in the month.
    public int UsedInMonth { get; set; }
    public List<AvailabilityDayDto> Days { get; set; } = [];
}

public class AvailabilityDayDto
{
    public DateOnly Date { get; set; }
    // Inside the booking window (the slots may still be taken).
    public bool InWindow { get; set; }
    public List<AvailabilitySlotDto> Slots { get; set; } = [];
}

public class AvailabilitySlotDto
{
    // Null = the whole day.
    public int? ShiftId { get; set; }
    public string Name { get; set; } = string.Empty;
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public bool IsFree { get; set; }
    // Taken by one of the user's units.
    public bool IsMine { get; set; }
}

public record CommonAreaPhotoDownload(Stream Content, string ContentType, string FileName);
