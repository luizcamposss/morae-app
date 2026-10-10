namespace backend.DTOs.Assembly;

// What the user can vote on: one entry per unit they are linked to in the condominium.
public class MyBallotDto
{
    public int AssemblyId { get; set; }
    public bool VotingOpen { get; set; }
    public List<BallotUnitDto> Units { get; set; } = [];
}

public class BallotUnitDto
{
    public int UnitId { get; set; }
    public string UnitLabel { get; set; } = string.Empty;
    public bool CanVote { get; set; }
    // Why the unit cannot vote (not an owner, overdue charge...).
    public string? BlockReason { get; set; }
    // The unit's current choice for each item (itemId → optionId), whoever of the household voted.
    public Dictionary<int, int> Votes { get; set; } = [];
    public string? LastVotedByName { get; set; }
    public DateTime? LastVotedAt { get; set; }
}

public class CastVotesDto
{
    public int UnitId { get; set; }
    public List<CastVoteDto> Votes { get; set; } = [];
}

public class CastVoteDto
{
    public int ItemId { get; set; }
    public int OptionId { get; set; }
}
