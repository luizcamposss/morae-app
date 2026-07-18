using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace backend.DTOs.Person;

public class PersonResponseDto
{
    public int Id { get; set; }
    public int? CondominiumId { get; set; }
    public string CondominiumName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CPF { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public int UnitCount { get; set; }
    public string MainUnit { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
