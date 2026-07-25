using backend.Enums;

namespace backend.DTOs.FinancialAccount;

public class FinancialAccountResponseDto
{
    public int Id { get; set; }
    public FinancialAccountScope Scope { get; set; }
    public int? CondominiumId { get; set; }
    public string? CondominiumName { get; set; }
    public string HolderName { get; set; } = string.Empty;
    public string HolderDocument { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string Agency { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountDigit { get; set; }
    public BankAccountType AccountType { get; set; }
    public PixKeyType PixKeyType { get; set; }
    public string PixKey { get; set; } = string.Empty;
    public int UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
