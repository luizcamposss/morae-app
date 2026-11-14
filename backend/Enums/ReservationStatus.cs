namespace backend.Enums;

public enum ReservationStatus
{
    Undefined = 0,
    Pending = 1,   // Waiting for the management (areas that require approval)
    Approved = 2,
    Rejected = 3,
    Canceled = 4
}
