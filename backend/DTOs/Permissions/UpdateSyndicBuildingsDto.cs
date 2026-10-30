namespace backend.DTOs.Permissions;

public class UpdateSyndicBuildingsDto
{
    // true = the syndic manages every building of the condominium (BuildingIds is ignored).
    public bool AllBuildings { get; set; }
    public List<int> BuildingIds { get; set; } = [];
}
