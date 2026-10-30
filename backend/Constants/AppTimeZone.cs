namespace backend.Constants;

// MORAÊ operates on São Paulo time. Instants are stored in UTC; calendar rules
// (due dates, overdue, "today") use the São Paulo calendar day, which in the evening is
// one day behind UTC.
public static class AppTimeZone
{
    public static readonly TimeZoneInfo SaoPaulo = FindSaoPaulo();

    public static DateTime Today => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, SaoPaulo).Date;

    // A calendar date picked in the UI (no time), as the UTC instant its day starts in São Paulo.
    public static DateTime StartOfDayToUtc(DateTime saoPauloDate)
    {
        return TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(saoPauloDate.Date, DateTimeKind.Unspecified),
            SaoPaulo);
    }

    private static TimeZoneInfo FindSaoPaulo()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        }
        catch (Exception exception) when (exception is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            // Hosts without tz data: Brazil has had no daylight saving time since 2019.
            return TimeZoneInfo.CreateCustomTimeZone("America/Sao_Paulo", TimeSpan.FromHours(-3), "Brasília", "Brasília");
        }
    }
}
