namespace backend.DTOs.FinancialAccount;

public class FinancialAccountResponseDto
{
    public int Id { get; set; }
    public int? CondominiumId { get; set; }
    public string? CondominiumName { get; set; }
    public string PixKey { get; set; } = string.Empty;
    public int UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
