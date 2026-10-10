namespace backend.Enums;

// Calculated from the next due date (never stored).
public enum MaintenanceStatus
{
    Undefined = 0,
    UpToDate = 1,   // Em dia
    DueSoon = 2,    // Vence em até 30 dias
    Overdue = 3     // Atrasada
}
