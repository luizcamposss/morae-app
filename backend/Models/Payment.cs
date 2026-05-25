using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
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
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}