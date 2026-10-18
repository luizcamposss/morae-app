namespace backend.DTOs.News;

// Who has not read a notice yet: only the name and the unit (privacy).
public class NewsUnreadRecipientDto
{
    public string Name { get; set; } = string.Empty;
    public string? BuildingName { get; set; }
    public string? UnitNumber { get; set; }
}
