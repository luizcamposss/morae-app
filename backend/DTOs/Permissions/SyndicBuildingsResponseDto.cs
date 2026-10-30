namespace backend.DTOs.Permissions;

public class SyndicBuildingsResponseDto
{
    public int UserId { get; set; }
    public int CondominiumId { get; set; }
    public bool AllBuildings { get; set; }
    public List<SyndicBuildingItemDto> Buildings { get; set; } = [];
}

public class SyndicBuildingItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
