namespace backend.Settings;

public class StorageSettings
{
    // Folder where uploaded files are kept. Empty = "storage" inside the API folder (development).
    // In production, mount it as a Docker volume and include it in the backups.
    public string LocalPath { get; set; } = string.Empty;
}
