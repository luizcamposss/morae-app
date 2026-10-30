using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs.FinancialAccount;

public class UpsertFinancialAccountDto
{
    // Nullable so a missing type fails [Required] instead of silently becoming 0.
    [Required]
    public PixKeyType? PixKeyType { get; set; }

    [Required]
    [StringLength(120, MinimumLength = 3)]
    public string PixKey { get; set; } = string.Empty;
}
