using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using backend.Constants;
using backend.Enums;

namespace backend.Models;

public class Condominium
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(14)]
    public string CNPJ { get; set; } = string.Empty;

    [Required]
    [StringLength(8)]
    public string CEP { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string Number { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [StringLength(2)]
    public string State { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(150)]
    public string EmailContact { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public Status Status { get; set; } = Status.Active;

    public CondominiumType Type { get; set; } = CondominiumType.Residential;

    // Enabled module keys (Constants/AppModules), comma-separated. Read it through AppModules.Parse.
    [StringLength(300)]
    public string EnabledModules { get; set; } = AppModules.Serialize(AppModules.All);

    public int CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;
    public ICollection<Building> Buildings { get; set; } = new List<Building>();
    public ICollection<UserCondominium> UserCondominiums { get; set; } = [];
    public ICollection<PersonCondominium> PersonCondominiums { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Billing rules, set by the Admin. The due day is used by batches and recurring charges
    // (clamped to the last day of short months).
    [Range(1, 31)]
    public int BillingDueDay { get; set; } = 10;

    // Fine and interest only apply to charges created while this is on (snapshot on the charge).
    public bool LateFeeEnabled { get; set; }
    public decimal FinePercent { get; set; } = 2m;
    public decimal MonthlyInterestPercent { get; set; } = 1m;

    // Cash the condominium had when it started its accounts in Moraê (monthly balance).
    // OpeningBalanceMonth (first day of the month) = the month it refers to; movements before it
    // are left out of the accumulated balance. Null month = counts from the first movement.
    public decimal OpeningBalance { get; set; }
    public DateOnly? OpeningBalanceMonth { get; set; }
}
