namespace backend.DTOs.Charge;

public class ChargeBatchResultDto
{
    public DateTime DueDate { get; set; }
    public int CreatedCount { get; set; }
    public decimal TotalValue { get; set; }
    public List<ChargeResponseDto> Charges { get; set; } = [];
    // Units left out of the batch (no one linked to them), so the manager can fix and charge later.
    public List<SkippedUnitDto> Skipped { get; set; } = [];
}

public class SkippedUnitDto
{
    public int UnitId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}
