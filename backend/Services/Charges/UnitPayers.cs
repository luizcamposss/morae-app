using backend.Data;
using backend.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Charges;

// Who pays a unit's condominium bills (charges without a recipient: fee, water, light, apportionment…).
// One rule for the whole app (#208):
//   - rented with "the tenant pays the condominium" → the tenant, for bills due from the contract's start
//     (older debts stay with the owners);
//   - otherwise → the unit's owners;
//   - no owner registered → everyone linked to the unit (as before).
// Rent is always the tenant's (its charge has the tenant as recipient).
public static class UnitPayers
{
    public sealed record Rule(int? TenantId, DateTime TenantFrom, HashSet<int> Others)
    {
        // The people who pay a bill of this unit due on that date.
        public HashSet<int> For(DateTime dueDate) =>
            TenantId is { } tenantId && dueDate.Date >= TenantFrom ? [tenantId] : Others;
    }

    public static async Task<Dictionary<int, Rule>> GetRulesAsync(AppDbContext context, IReadOnlyCollection<int> unitIds)
    {
        if (unitIds.Count == 0)
            return [];

        var links = await context.PersonUnits
            .AsNoTracking()
            .Where(link => unitIds.Contains(link.UnitId))
            .Select(link => new { link.UnitId, link.PersonId, link.RelationshipType })
            .ToListAsync();

        var tenants = await TenantsWhoPayAsync(context, unitIds);

        return unitIds.Distinct().ToDictionary(unitId => unitId, unitId =>
        {
            var unitLinks = links.Where(link => link.UnitId == unitId).ToList();
            var owners = unitLinks.Where(link => link.RelationshipType == UnitRelationshipType.Owner).Select(link => link.PersonId).ToHashSet();
            var others = owners.Count > 0 ? owners : unitLinks.Select(link => link.PersonId).ToHashSet();

            return tenants.TryGetValue(unitId, out var tenant)
                ? new Rule(tenant.PersonId, tenant.From.ToDateTime(TimeOnly.MinValue), others)
                : new Rule(null, DateTime.MaxValue, others);
        });
    }

    public static async Task<HashSet<int>> GetPersonIdsAsync(AppDbContext context, int unitId, DateTime dueDate) =>
        (await GetRulesAsync(context, [unitId]))[unitId].For(dueDate);

    // The tenant (and contract start) of an active rental contract that says the tenant pays the condominium.
    public static async Task<Dictionary<int, (int PersonId, DateOnly From)>> TenantsWhoPayAsync(AppDbContext context, IReadOnlyCollection<int> unitIds)
    {
        var contracts = await context.RentalContracts
            .AsNoTracking()
            .Where(contract =>
                unitIds.Contains(contract.UnitId) &&
                contract.Status == RentalContractStatus.Active &&
                contract.CondominiumBillsPaidBy == CondominiumBillsPayer.Tenant)
            .Select(contract => new { contract.UnitId, contract.TenantPersonId, contract.StartDate })
            .ToListAsync();

        return contracts
            .GroupBy(contract => contract.UnitId)
            .ToDictionary(group => group.Key, group => (group.First().TenantPersonId, group.First().StartDate));
    }
}
