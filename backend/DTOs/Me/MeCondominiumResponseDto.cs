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
    public CondominiumType Type { get; set; }
    // Enabled module keys (Constants/AppModules); screens of other modules are hidden.
    public IReadOnlyList<string> EnabledModules { get; set; } = [];
    // Owns a unit there: may rent it out and receive the rent in their own account ("Meus aluguéis").
    public bool IsUnitOwner { get; set; }
    // Rents out a unit there as its owner: "Meus aluguéis" shows in the menu only then (#208).
    public bool HasOwnRentalContracts { get; set; }
}