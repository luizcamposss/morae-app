using System.ComponentModel.DataAnnotations;

namespace backend.Models;

// What an expense was spent on. Each condominium has its own list: the default ones are created
// the first time the list is needed, and the management can rename them or add its own.
public class ExpenseCategory
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    [Required]
    [StringLength(60)]
    public string Name { get; set; } = string.Empty;

    // Icon of a default category (e.g. "water"); null for the ones the condominium created.
    [StringLength(30)]
    public string? IconKey { get; set; }

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
