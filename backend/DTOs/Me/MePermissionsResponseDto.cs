using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.DTOs.Me;

public class MePermissionsResponseDto
{
    public int CondominiumId { get; set; }
    public string Role { get; set; } = string.Empty;
    public IEnumerable<string> Permissions { get; set; } = [];
}