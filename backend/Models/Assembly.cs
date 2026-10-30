using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

public class Assembly
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    [Required]
    [StringLength(150)]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Description { get; set; }

    public AssemblyType Type { get; set; }
    public AssemblyVoterRule VoterRule { get; set; }

    // Optional in-person (or video) meeting, for hybrid assemblies.
    public DateTime? MeetingAt { get; set; }

    [StringLength(200)]
    public string? MeetingLocation { get; set; }

    public DateTime VotingStartsAt { get; set; }
    public DateTime VotingEndsAt { get; set; }

    public AssemblyStatus Status { get; set; } = AssemblyStatus.Draft;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime? CanceledAt { get; set; }

    [StringLength(500)]
    public string? CancelReason { get; set; }

    // Units able to vote when voting closed (frozen base for quorums over units).
    public int? EligibleUnitsCount { get; set; }

    public DateTime? ClosingReminderSentAt { get; set; }

    // The signed minutes (ata), published in Documents.
    public int? MinutesDocumentId { get; set; }
    public Document? MinutesDocument { get; set; }

    public ICollection<AssemblyItem> Items { get; set; } = [];

    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// One agenda item (pauta).
public class AssemblyItem
{
    public int Id { get; set; }

    public int AssemblyId { get; set; }
    public Assembly Assembly { get; set; } = null!;

    public int Order { get; set; }

    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Description { get; set; }

    public AssemblyVoteType VoteType { get; set; }
    public AssemblyQuorum Quorum { get; set; }

    // Secret: the result shows only totals, never how each unit voted.
    public bool IsSecret { get; set; }

    public ICollection<AssemblyItemOption> Options { get; set; } = [];
}

public class AssemblyItemOption
{
    public int Id { get; set; }

    public int AssemblyItemId { get; set; }
    public AssemblyItem AssemblyItem { get; set; } = null!;

    public int Order { get; set; }

    [Required]
    [StringLength(200)]
    public string Text { get; set; } = string.Empty;

    // "Sim" in a yes/no item: what the quorum counts as approval.
    public bool IsApproval { get; set; }

    // "Abstenção": counts as participation, never for or against.
    public bool IsAbstention { get; set; }

    // Optional attachment (e.g. a company's budget) in the file storage, sent while a draft.
    [StringLength(200)]
    public string? AttachmentFileName { get; set; }

    [StringLength(100)]
    public string? AttachmentContentType { get; set; }

    public long? AttachmentSizeBytes { get; set; }

    [StringLength(200)]
    public string? AttachmentStorageKey { get; set; }
}

// One unit's vote on one agenda item (unique per item and unit; changing the vote updates it).
// For secret items the unit is still stored, so it cannot vote twice, but it is never shown.
public class AssemblyVote
{
    public int Id { get; set; }

    public int AssemblyId { get; set; }
    public Assembly Assembly { get; set; } = null!;

    public int AssemblyItemId { get; set; }
    public AssemblyItem AssemblyItem { get; set; } = null!;

    public int AssemblyItemOptionId { get; set; }
    public AssemblyItemOption Option { get; set; } = null!;

    public int UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    public int VotedByUserId { get; set; }
    public ApplicationUser VotedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
