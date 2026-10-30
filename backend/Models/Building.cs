using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Models;

public class Building
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(30)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(30)]
    public string BuildingType { get; set; } = "Residencial";

    [Range(0, 300)]
    public int FloorCount { get; set; }

    public bool HasElevator { get; set; }

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;

    public ICollection<Unit> Units { get; set; } = new List<Unit>();
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
