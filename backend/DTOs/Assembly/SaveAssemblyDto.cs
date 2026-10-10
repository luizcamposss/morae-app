using backend.Enums;

namespace backend.DTOs.Assembly;

// Create or edit a draft. The items are replaced as a whole on every save.
public class SaveAssemblyDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AssemblyType Type { get; set; }
    public AssemblyVoterRule VoterRule { get; set; }
    public DateTime? MeetingAt { get; set; }
    public string? MeetingLocation { get; set; }
    public DateTime? VotingStartsAt { get; set; }
    public DateTime? VotingEndsAt { get; set; }
    public List<SaveAssemblyItemDto> Items { get; set; } = [];
}

public class SaveAssemblyItemDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AssemblyVoteType VoteType { get; set; }
    public AssemblyQuorum Quorum { get; set; }
    public bool IsSecret { get; set; }
    // Multiple choice only (2 to 10); "Abstenção" is added automatically.
    public List<string> Options { get; set; } = [];
}

public class CancelAssemblyDto
{
    public string Reason { get; set; } = string.Empty;
}
