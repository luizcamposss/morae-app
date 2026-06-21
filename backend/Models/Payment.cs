using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.Models;

public class Payment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChargeId { get; set; }
    public Charge Charge { get; set; } = null!;

    [Required]
    public decimal AmountPaid { get; set; }

    [Required]
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Undefined;

    [Required]
    public int RegisteredByUserId { get; set; }
    public ApplicationUser RegisteredByUser { get; set; } = null!;

    [StringLength(255)]
    public string? Notes { get; set; }

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}