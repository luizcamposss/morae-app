namespace backend.DTOs.PaymentProof;

public record PaymentProofDownload(Stream Content, string ContentType, string FileName);
