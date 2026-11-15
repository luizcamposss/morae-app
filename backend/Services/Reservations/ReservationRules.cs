using backend.Constants;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Reservations;

// Helpers shared by the common area and reservation services.
public static class ReservationRules
{
    public const string WholeDayName = "Dia inteiro";

    public record UserUnit(int UnitId, int BuildingId, string Label);

    public static DateOnly Today() => DateOnly.FromDateTime(AppTimeZone.Today);

    // The slot an active reservation holds (see Reservation.SlotKey).
    public static string SlotKey(DateOnly date, int? shiftId) => $"{date:yyyy-MM-dd}#{shiftId ?? 0}";

    // Units the user is linked to in the condominium (owner, resident or tenant): the ones he books for.
    public static async Task<List<UserUnit>> GetUserUnitsAsync(AppDbContext context, int userId, int condominiumId)
    {
        return await context.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .SelectMany(user => context.PersonUnits.Where(personUnit => personUnit.PersonId == user.PersonId))
            .Where(personUnit => personUnit.Unit.Building.CondominiumId == condominiumId)
            .Select(personUnit => new UserUnit(
                personUnit.UnitId,
                personUnit.Unit.BuildingId,
                personUnit.Unit.Building.Name + ", unidade " + personUnit.Unit.Number))
            .Distinct()
            .ToListAsync();
    }
}
