namespace backend.Enums;

public enum VisitStatus
{
    Undefined = 0,
    Active = 1,
    Canceled = 2   // Kept (not deleted) so the management keeps the trace of who was authorized
}
