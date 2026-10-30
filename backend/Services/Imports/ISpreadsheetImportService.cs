using backend.DTOs.Import;

namespace backend.Services.Imports;

public interface ISpreadsheetImportService
{
    Task<(byte[] Content, string ContentType, string FileName)> GetTemplateAsync(int userId, int condominiumId, string format);
    Task<ImportPreviewDto> PreviewAsync(int userId, int condominiumId, IFormFile? file);
    Task<ImportResultDto> ConfirmAsync(int userId, int condominiumId, IFormFile? file);
}
