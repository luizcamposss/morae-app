namespace backend.DTOs.Document;

public record DocumentDownload(Stream Content, string ContentType, string FileName);
