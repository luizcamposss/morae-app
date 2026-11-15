using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Me;

// What the in-app tutorial already showed to the user ("tour:admin", "tip:finance").
public class GuidesDto
{
    public bool ShowTips { get; set; } = true;
    public List<string> Seen { get; set; } = [];
}

public class UpdateGuidesDto
{
    public bool? ShowTips { get; set; }

    // Tours/tips to mark as seen.
    [MaxLength(20)]
    public List<string>? MarkSeen { get; set; }

    // Forget the screen tips already seen: they show again (the tour stays as seen).
    public bool ResetTips { get; set; }
}
