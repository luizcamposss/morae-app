using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs.FinancialAccount;

public class UpsertFinancialAccountDto
{
    [Required]
    [StringLength(120, MinimumLength = 3)]
    public string HolderName { get; set; } = string.Empty;

    [Required]
    [StringLength(14, MinimumLength = 11)]
    public string HolderDocument { get; set; } = string.Empty;

    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string BankName { get; set; } = string.Empty;

    [Required]
    [StringLength(10, MinimumLength = 1)]
    public string BankCode { get; set; } = string.Empty;

    [Required]
    [StringLength(12, MinimumLength = 1)]
    public string Agency { get; set; } = string.Empty;

    [Required]
    [StringLength(20, MinimumLength = 3)]
    public string AccountNumber { get; set; } = string.Empty;

    [StringLength(4)]
    public string? AccountDigit { get; set; }

    [Required]
    public BankAccountType AccountType { get; set; }

    [Required]
    public PixKeyType PixKeyType { get; set; }

    [Required]
    [StringLength(120, MinimumLength = 3)]
    public string PixKey { get; set; } = string.Empty;
}
