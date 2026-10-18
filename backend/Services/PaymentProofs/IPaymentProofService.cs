using backend.DTOs.PaymentProof;

namespace backend.Services.PaymentProofs;

public interface IPaymentProofService
{
    Task<ChargePixInfoDto> GetPixInfoAsync(int userId, int chargeId);
    Task<PaymentProofResponseDto> CreateAsync(int userId, int chargeId, CreatePaymentProofDto dto);
    Task<IEnumerable<PaymentProofResponseDto>> GetByChargeAsync(int userId, int chargeId);
    Task<PaymentProofDownload> DownloadAsync(int userId, int proofId);
    Task<PaymentProofResponseDto> RejectAsync(int userId, int proofId, RejectPaymentProofDto dto);
}
