namespace backend.DTOs.Maintenance;

public record MaintenanceAttachmentDownload(Stream Content, string ContentType, string FileName);
