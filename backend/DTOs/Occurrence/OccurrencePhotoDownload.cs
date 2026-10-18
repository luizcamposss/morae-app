namespace backend.DTOs.Occurrence;

public record OccurrencePhotoDownload(Stream Content, string ContentType, string FileName);
