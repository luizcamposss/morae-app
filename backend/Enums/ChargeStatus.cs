namespace backend.Enums;

public enum ChargeStatus
{
    Undefined = 0,
    Pending = 1,
    Paid = 2,
    Overdue = 3,
    Canceled = 4,
    // Part of a debt agreement: kept in the history, out of delinquency, no more fine/interest.
    // Goes back to Overdue if the agreement is broken or canceled.
    Renegotiated = 5
}