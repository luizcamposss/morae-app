using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace backend.DTOs.UserCondominiumAccess;

public class SuspendUserCondominiumDto
{
    [StringLength(300)]
    public string? SuspensionReason { get; set; }
}