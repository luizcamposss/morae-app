namespace backend.Enums;

public enum AssemblyType
{
    Undefined = 0,
    Ordinary = 1,       // AGO: yearly (accounts, budget, election)
    Extraordinary = 2   // AGE: any other matter
}

public enum AssemblyVoterRule
{
    Undefined = 0,
    OwnersOnly = 1,          // Only unit owners vote (the legal default)
    OwnersAndResidents = 2   // Owners or any resident of the unit (still one vote per unit)
}

public enum AssemblyStatus
{
    Undefined = 0,
    Draft = 1,      // Being prepared; only the management sees it
    Published = 2,  // Convened; voting opens and closes at the set times
    Closed = 3,     // Voting ended and votes counted
    Canceled = 4
}

// Calculated from the status and the voting period.
public enum AssemblyPhase
{
    Undefined = 0,
    Draft = 1,
    Scheduled = 2,  // Published, voting not open yet
    Open = 3,       // Voting open
    Closed = 4,
    Canceled = 5
}

public enum AssemblyVoteType
{
    Undefined = 0,
    YesNo = 1,          // Sim / Não (+ Abstenção)
    MultipleChoice = 2  // Options typed by the management (+ Abstenção)
}

// What it takes to approve an item (abstentions never count as approval).
public enum AssemblyQuorum
{
    Undefined = 0,
    MajorityOfVotes = 1,        // More "yes" than "no" among those who voted
    AbsoluteMajorityOfUnits = 2,// "Yes" from more than half of the units able to vote
    TwoThirdsOfUnits = 3,       // "Yes" from at least 2/3 of the units able to vote
    Unanimity = 4               // "Yes" from every unit able to vote
}
