using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

public class FinancialAccount
{
    [Key]
    public int Id { get; set; }

    [Required]
    public FinancialAccountScope Scope { get; set; }

    public int? CondominiumId { get; set; }
    public Condominium? Condominium { get; set; }

    [Required]
    [StringLength(120)]
    public string HolderName { get; set; } = string.Empty;

    [Required]
    [StringLength(14)]
    public string HolderDocument { get; set; } = string.Empty;

    [Required]
    [StringLength(80)]
    public string BankName { get; set; } = string.Empty;

    [Required]
    [StringLength(10)]
    public string BankCode { get; set; } = string.Empty;

    [Required]
    [StringLength(12)]
    public string Agency { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string AccountNumber { get; set; } = string.Empty;

    [StringLength(4)]
    public string? AccountDigit { get; set; }

    [Required]
    public BankAccountType AccountType { get; set; }

    [Required]
    public PixKeyType PixKeyType { get; set; }

    [Required]
    [StringLength(120)]
    public string PixKey { get; set; } = string.Empty;

    [Required]
    public int UpdatedByUserId { get; set; }
    public ApplicationUser UpdatedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
