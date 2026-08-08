using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.FinancialAccount;

public class UpsertFinancialAccountDto
{
    [Required]
    [StringLength(120, MinimumLength = 3)]
    public string PixKey { get; set; } = string.Empty;
}
