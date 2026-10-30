using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace backend.DTOs.Building;

public class CreateBuildingDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(30)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(30)]
    public string BuildingType { get; set; } = "Residencial";

    [Range(0, 300)]
    public int FloorCount { get; set; }

    public bool HasElevator { get; set; }

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;
}
