using backend.Enums;

namespace backend.DTOs.Assembly;

public class AssemblyResponseDto
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AssemblyType Type { get; set; }
    public AssemblyVoterRule VoterRule { get; set; }
    public DateTime? MeetingAt { get; set; }
    public string? MeetingLocation { get; set; }
    public DateTime VotingStartsAt { get; set; }
    public DateTime VotingEndsAt { get; set; }
    public AssemblyStatus Status { get; set; }
    public AssemblyPhase Phase { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime? CanceledAt { get; set; }
    public string? CancelReason { get; set; }
    public int ItemsCount { get; set; }
    // Details only (null in lists).
    public List<AssemblyItemResponseDto>? Items { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AssemblyItemResponseDto
{
    public int Id { get; set; }
    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AssemblyVoteType VoteType { get; set; }
    public AssemblyQuorum Quorum { get; set; }
    public bool IsSecret { get; set; }
    public List<AssemblyOptionResponseDto> Options { get; set; } = [];
}

public class AssemblyOptionResponseDto
{
    public int Id { get; set; }
    public int Order { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsAbstention { get; set; }
}
