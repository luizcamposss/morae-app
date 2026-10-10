using backend.Enums;

namespace backend.DTOs.Assembly;

public class AssemblyResultsDto
{
    public int AssemblyId { get; set; }
    public string Title { get; set; } = string.Empty;
    // False while voting is open: only participation is shown, never partial counts.
    public bool IsFinal { get; set; }
    public DateTime VotingEndsAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public int EligibleUnits { get; set; }
    public int VotedUnits { get; set; }
    public List<AssemblyItemResultDto> Items { get; set; } = [];
    public int? MinutesDocumentId { get; set; }
    public string? MinutesDocumentTitle { get; set; }
}

public class AssemblyItemResultDto
{
    public int ItemId { get; set; }
    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public AssemblyVoteType VoteType { get; set; }
    public AssemblyQuorum Quorum { get; set; }
    public bool IsSecret { get; set; }
    public int TotalVotes { get; set; }
    public int Abstentions { get; set; }
    public AssemblyItemOutcome Outcome { get; set; }
    public int? WinnerOptionId { get; set; }
    // Plain-language explanation, e.g. "Aprovada: 24 votos Sim de 30 unidades (mínimo 20)".
    public string Summary { get; set; } = string.Empty;
    public List<AssemblyOptionResultDto> Options { get; set; } = [];
}

public class AssemblyOptionResultDto
{
    public int OptionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsAbstention { get; set; }
    public int Votes { get; set; }
    // How each unit voted; null on secret items.
    public List<string>? Units { get; set; }
}

public class SetMinutesDto
{
    // Null removes the link.
    public int? DocumentId { get; set; }
}
