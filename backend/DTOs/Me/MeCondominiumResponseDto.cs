using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Me;

public class MeCondominiumResponseDto
{
    public int CondominiumId { get; set; }
    public string CondominiumName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public UserCondominiumStatus Status { get; set; }
}