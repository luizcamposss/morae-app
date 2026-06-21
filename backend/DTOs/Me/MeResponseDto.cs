using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.DTOs.Me;

public class MeResponseDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public int PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public IEnumerable<string> Roles { get; set; } = [];
}