namespace backend.Enums;

public enum RentalContractStatus
{
    Active = 1,
    // Ended on its end date or terminated: no more rent is generated.
    Ended = 2
}

// How the rent is adjusted every 12 months. The system only reminds the management;
// the new value is typed in by hand.
public enum RentAdjustmentIndex
{
    Ipca = 1,
    Igpm = 2,
    // A value agreed between the parties.
    Agreed = 3,
    None = 4
}
