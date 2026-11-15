namespace backend.Services.Reports;

public interface IReportService
{
    Task<ReportDownload> GenerateAsync(
        int userId,
        int condominiumId,
        string reportType,
        string? from,
        string? to,
        int? buildingId,
        string format);
}

public record ReportDownload(byte[] Content, string ContentType, string FileName);
