using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class PersonCondominium
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int PersonId { get; set; }
    public Person Person { get; set; } = null!;

    [Required]
    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
