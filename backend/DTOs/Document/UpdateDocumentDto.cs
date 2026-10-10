using backend.Enums;

namespace backend.DTOs.Document;

// Changes the details only; to replace the file, delete the document and upload it again.
public class UpdateDocumentDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DocumentCategory Category { get; set; }
    public DocumentVisibility Visibility { get; set; }
}
