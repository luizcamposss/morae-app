using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Charge;

public class CreateChargeBatchDto
{
    // Null = every building of the condominium.
    public int? BuildingId { get; set; }

    [Required]
    [Range(0.01, 99999999.99)]
    public decimal Value { get; set; }

    // Null = next date on the condominium's billing due day.
    public DateTime? DueDate { get; set; }

    [Required]
    [StringLength(255)]
    public string Description { get; set; } = string.Empty;

    // Units that pay a different value than the batch default.
    public List<ChargeUnitValueDto> UnitValues { get; set; } = [];
}

public class ChargeUnitValueDto
{
    [Required]
    public int UnitId { get; set; }

    [Required]
    [Range(0.01, 99999999.99)]
    public decimal Value { get; set; }
}
