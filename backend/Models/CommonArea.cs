using System.ComponentModel.DataAnnotations;

namespace backend.Models;

// A bookable common area (party room, barbecue, court...) with its booking rules. BuildingId set
// = only the units of that building book it; null = the whole condominium.
public class CommonArea
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public int? BuildingId { get; set; }
    public Building? Building { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    public int? Capacity { get; set; }

    // Inactive areas keep their history but take no new reservations.
    public bool IsActive { get; set; } = true;

    // True = one reservation per day; false = booked by shift (Shifts).
    public bool FullDay { get; set; }

    // Booking window, in days from today (São Paulo): from today + Min to today + Max.
    public int MinAdvanceDays { get; set; }
    public int MaxAdvanceDays { get; set; } = 90;

    // Active reservations (pending or approved) per unit and calendar month. Null = no limit.
    public int? MonthlyLimitPerUnit { get; set; }

    public bool RequiresApproval { get; set; }

    // Billed to the unit (charge category Reservation) when the reservation is approved. Null = free.
    public decimal? Fee { get; set; }

    // Canceling up to this many days before the date cancels the fee. Null = always free to cancel.
    public int? FreeCancellationDays { get; set; }

    [StringLength(4000)]
    public string? Terms { get; set; }

    // Optional photo; the file lives in IFileStorage.
    [StringLength(200)]
    public string? PhotoStorageKey { get; set; }

    [StringLength(100)]
    public string? PhotoContentType { get; set; }

    [StringLength(160)]
    public string? PhotoFileName { get; set; }

    public ICollection<CommonAreaShift> Shifts { get; set; } = new List<CommonAreaShift>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// A bookable period of the day ("Almoço 11:00-16:00"). Removed shifts are kept inactive so past
// reservations still point to them.
public class CommonAreaShift
{
    public int Id { get; set; }

    public int CommonAreaId { get; set; }
    public CommonArea CommonArea { get; set; } = null!;

    [Required]
    [StringLength(60)]
    public string Name { get; set; } = string.Empty;

    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
