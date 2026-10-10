using backend.Enums;

namespace backend.DTOs.Document;

// Sent as multipart/form-data together with the file.
public class CreateDocumentDto
{
    public IFormFile? File { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DocumentCategory Category { get; set; }
    public DocumentVisibility Visibility { get; set; }
}
