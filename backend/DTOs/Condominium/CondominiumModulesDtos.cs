using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs.Condominium;

public class CondominiumModuleDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public class CondominiumModulesDto
{
    public int CondominiumId { get; set; }
    public CondominiumType Type { get; set; }
    public IReadOnlyList<CondominiumModuleDto> Modules { get; set; } = [];
}

public class UpdateCondominiumModulesDto
{
    // Keys from Constants/AppModules; the ones left out are disabled.
    [Required]
    public List<string> EnabledModules { get; set; } = [];
}
