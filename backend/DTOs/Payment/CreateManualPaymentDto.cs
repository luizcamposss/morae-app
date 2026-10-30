using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Payment;

public class CreateManualPaymentDto
{
    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal AmountPaid { get; set; }

    [Required]
    public PaymentMethod PaymentMethod { get; set; }

    public DateTime? PaidAt { get; set; }

    [StringLength(255)]
    public string? Notes { get; set; }
}