using System.ComponentModel.DataAnnotations;

namespace backend.Models;

// Photo attached when the occurrence is opened. The file itself lives in IFileStorage.
public class OccurrencePhoto
{
    public int Id { get; set; }

    public int OccurrenceId { get; set; }
    public Occurrence Occurrence { get; set; } = null!;

    [Required]
    [StringLength(160)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    [Required]
    [StringLength(200)]
    public string StorageKey { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
