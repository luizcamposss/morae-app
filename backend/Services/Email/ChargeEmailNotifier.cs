using backend.Constants;
using backend.Data;
using backend.Enums;
using backend.Models;
using backend.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services.Email;

public class ChargeEmailNotifier : IChargeEmailNotifier
{
    private readonly AppDbContext _context;
    private readonly IEmailQueue _emailQueue;
    private readonly AppSettings _appSettings;

    public ChargeEmailNotifier(
        AppDbContext context,
        IEmailQueue emailQueue,
        IOptions<AppSettings> appSettings)
    {
        _context = context;
        _emailQueue = emailQueue;
        _appSettings = appSettings.Value;
    }

    public async Task QueueNewChargeAsync(Charge charge)
    {
        var recipients = await GetPayersAsync(charge);
        var condominiumName = await GetCondominiumNameAsync(charge.CondominiumId);
        var unitLabel = await GetUnitLabelAsync(charge.UnitId);

        foreach (var recipient in recipients.Where(recipient => recipient.BillsEnabled))
        {
            var email = ChargeEmails.NewCharge(
                recipient.FirstName,
                charge.Scope == ChargeScope.Platform,
                condominiumName,
                unitLabel,
                charge.Description,
                charge.Value,
                charge.DueDate,
                GetChargesUrl(charge));

            _emailQueue.Enqueue(email.ToMessage(recipient.Email));
        }
    }

    public async Task QueuePaymentConfirmedAsync(Charge charge, Payment payment)
    {
        var recipients = await GetPayersAsync(charge);
        var condominiumName = await GetCondominiumNameAsync(charge.CondominiumId);

        foreach (var recipient in recipients)
        {
            var email = ChargeEmails.PaymentConfirmed(
                recipient.FirstName,
                condominiumName,
                charge.Description,
                payment.AmountPaid,
                payment.PaymentMethod,
                payment.PaidAt,
                GetChargesUrl(charge));

            _emailQueue.Enqueue(email.ToMessage(recipient.Email));
        }
    }

    // Same people who see the charge in the app: the condominium's Admins for platform charges,
    // the unit's residents for condominium charges. Only users with an active link to the condominium.
    private async Task<List<Recipient>> GetPayersAsync(Charge charge)
    {
        IQueryable<ApplicationUser> users;

        if (charge.Scope == ChargeScope.Platform)
        {
            users = _context.Users.Where(user => user.UserCondominiums.Any(link =>
                link.CondominiumId == charge.CondominiumId &&
                link.Role == AppRoles.Admin &&
                link.Status == UserCondominiumStatus.Active));
        }
        else if (charge.UnitId.HasValue)
        {
            var unitId = charge.UnitId.Value;

            users = _context.Users.Where(user =>
                _context.PersonUnits.Any(personUnit =>
                    personUnit.UnitId == unitId && personUnit.PersonId == user.PersonId) &&
                user.UserCondominiums.Any(link =>
                    link.CondominiumId == charge.CondominiumId &&
                    link.Status == UserCondominiumStatus.Active));
        }
        else
        {
            return [];
        }

        var rows = await users
            .AsNoTracking()
            .Where(user => user.Email != null && user.Email != "")
            .Select(user => new
            {
                Email = user.Email!,
                user.Person.Name,
                BillsEnabled = _context.UserNotificationPreferences
                    .Where(preference => preference.UserId == user.Id)
                    .Select(preference => (bool?)preference.BillsEnabled)
                    .FirstOrDefault() ?? true
            })
            .ToListAsync();

        return rows
            .Select(row => new Recipient(row.Email, FirstName(row.Name), row.BillsEnabled))
            .ToList();
    }

    private async Task<string> GetCondominiumNameAsync(int condominiumId)
    {
        return await _context.Condominiums
            .AsNoTracking()
            .Where(condominium => condominium.Id == condominiumId)
            .Select(condominium => condominium.Name)
            .FirstAsync();
    }

    private async Task<string?> GetUnitLabelAsync(int? unitId)
    {
        if (!unitId.HasValue)
            return null;

        var unit = await _context.Units
            .AsNoTracking()
            .Where(item => item.Id == unitId.Value)
            .Select(item => new { item.Number, BuildingName = item.Building.Name })
            .FirstOrDefaultAsync();

        return unit is null ? null : $"{unit.BuildingName}, unidade {unit.Number}";
    }

    private string GetChargesUrl(Charge charge)
    {
        return _appSettings.BuildFrontendUrl(
            charge.Scope == ChargeScope.Platform ? "admin/payments" : "resident/bills");
    }

    private static string FirstName(string? name)
    {
        return string.IsNullOrWhiteSpace(name) ? "morador(a)" : name.Trim().Split(' ')[0];
    }

    private record Recipient(string Email, string FirstName, bool BillsEnabled);
}
