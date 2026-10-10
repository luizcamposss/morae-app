namespace backend.Services.Storage;

// Where uploaded files live. Today a folder on the server (LocalFileStorage); an S3-compatible
// service (e.g. Cloudflare R2) can replace it later without touching the rest of the code.
public interface IFileStorage
{
    Task SaveAsync(string key, Stream content, CancellationToken cancellationToken = default);
    Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken = default);
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);
}
