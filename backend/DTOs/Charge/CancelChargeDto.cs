using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace backend.DTOs.Charge;

public class CancelChargeDto
{
    [StringLength(255)]
    public string? Reason { get; set; }
}