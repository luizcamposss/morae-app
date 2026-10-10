using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

public class Document
{
    public int Id { get; set; }

    public int CondominiumId { get; set; }
    public Condominium Condominium { get; set; } = null!;

    [Required]
    [StringLength(150)]
    public string Title { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    public DocumentCategory Category { get; set; }
    public DocumentVisibility Visibility { get; set; }

    // Shown to users and used as the download name. Never used as a path on disk.
    [Required]
    [StringLength(200)]
    public string OriginalFileName { get; set; } = string.Empty;

    // Detected from the file content on upload, not taken from the browser.
    [Required]
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    // Random name in the file storage.
    [Required]
    [StringLength(200)]
    public string StorageKey { get; set; } = string.Empty;

    public int UploadedByUserId { get; set; }
    public ApplicationUser UploadedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
