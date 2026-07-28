using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;

namespace backend.DTOs.Condominium;

public class CondominiumResponseDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string CNPJ { get; set; } = string.Empty;

    public string Number { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string State { get; set; } = string.Empty;

    public string EmailContact { get; set; } = string.Empty;

    public Status Status { get; set; }

    public int? AdminUserId { get; set; }

    public string? AdminName { get; set; }

    public string? AdminEmail { get; set; }

    public DateTime CreatedAt { get; set; }
}
