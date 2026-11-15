using backend.Enums;
using backend.Models;

namespace backend.Services.Charges;

public readonly record struct ChargeLateFeeAmounts(decimal Value, decimal Fine, decimal Interest, int DaysLate)
{
    public decimal Total => Value + Fine + Interest;
}

// Fine and interest of an overdue charge, using the rule snapshotted on it when it was created.
// Civil Code caps (art. 1.336): fine up to 2% and interest up to 1% a month, charged pro rata
// per day late (1% a month = 1/30% a day).
public static class ChargeLateFees
{
    public const decimal MaxFinePercent = 2m;
    public const decimal MaxMonthlyInterestPercent = 1m;

    // saoPauloDate: the São Paulo calendar day the amount is due on (today, or the day it was paid).
    public static ChargeLateFeeAmounts Calculate(Charge charge, DateTime saoPauloDate)
    {
        var daysLate = (saoPauloDate.Date - charge.DueDate.Date).Days;

        if (daysLate <= 0 ||
            charge.Status is ChargeStatus.Paid or ChargeStatus.Canceled or ChargeStatus.Renegotiated ||
            (charge.FinePercent is null && charge.MonthlyInterestPercent is null))
        {
            return new ChargeLateFeeAmounts(charge.Value, 0m, 0m, Math.Max(daysLate, 0));
        }

        var fine = Round(charge.Value * (charge.FinePercent ?? 0m) / 100m);
        var interest = Round(charge.Value * (charge.MonthlyInterestPercent ?? 0m) / 100m * daysLate / 30m);

        return new ChargeLateFeeAmounts(charge.Value, fine, interest, daysLate);
    }

    // The due date for a "due day" in a given month; day 31 becomes the month's last day.
    public static DateTime DueDateIn(int year, int month, int dueDay)
    {
        var day = Math.Min(dueDay, DateTime.DaysInMonth(year, month));
        return new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Unspecified);
    }

    // The next date (today or later) that falls on the due day.
    public static DateTime NextDueDate(int dueDay, DateTime today)
    {
        var thisMonth = DueDateIn(today.Year, today.Month, dueDay);

        if (thisMonth >= today.Date)
            return thisMonth;

        var nextMonth = today.AddMonths(1);
        return DueDateIn(nextMonth.Year, nextMonth.Month, dueDay);
    }

    private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
