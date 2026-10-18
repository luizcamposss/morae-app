namespace backend.Models;

// A user a condominium notice was sent to, saved when it is published (so the count does
// not change when people move in or out). ReadAt is set once, the first time they open it.
public class NewsRecipient
{
    public int Id { get; set; }

    public int NewsId { get; set; }
    public News News { get; set; } = null!;

    public int UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}
