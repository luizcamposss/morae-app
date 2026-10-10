using backend.DTOs.Document;
using backend.Enums;

namespace backend.Services.Documents;

public interface IDocumentService
{
    Task<DocumentResponseDto> CreateAsync(int userId, int condominiumId, CreateDocumentDto dto);
    Task<IEnumerable<DocumentResponseDto>> GetByCondominiumAsync(int userId, int condominiumId, DocumentCategory? category);
    Task<DocumentResponseDto> UpdateAsync(int userId, int documentId, UpdateDocumentDto dto);
    Task DeleteAsync(int userId, int documentId);
    Task<DocumentDownload> DownloadAsync(int userId, int documentId);
}
