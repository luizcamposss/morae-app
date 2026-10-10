namespace backend.Models;

// A building a syndic manages, chosen by the condominium's Admin
// (ignored when the syndic manages all buildings).
public class UserCondominiumBuilding
{
    public int Id { get; set; }

    public int UserCondominiumId { get; set; }
    public UserCondominium UserCondominium { get; set; } = null!;

    public int BuildingId { get; set; }
    public Building Building { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
