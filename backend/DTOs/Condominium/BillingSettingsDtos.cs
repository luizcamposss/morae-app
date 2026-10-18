using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Condominium;

public class BillingSettingsDto
{
    public int CondominiumId { get; set; }
    public int BillingDueDay { get; set; }
    public bool LateFeeEnabled { get; set; }
    public decimal FinePercent { get; set; }
    public decimal MonthlyInterestPercent { get; set; }
    public decimal MaxFinePercent { get; set; }
    public decimal MaxMonthlyInterestPercent { get; set; }
}

public class UpdateBillingSettingsDto
{
    [Required]
    [Range(1, 31)]
    public int BillingDueDay { get; set; }

    [Required]
    public bool LateFeeEnabled { get; set; }

    [Required]
    [Range(0, 2)]
    public decimal FinePercent { get; set; }

    [Required]
    [Range(0, 1)]
    public decimal MonthlyInterestPercent { get; set; }
}
