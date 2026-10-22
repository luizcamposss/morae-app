using System.Security.Cryptography;
using System.Text;
using backend.Constants;
using backend.Data;
using backend.Enums;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Seeders;

// Development only: creates a test condominium with one account per role and writes the
// credentials to backend/.env.test-accounts (gitignored), used by agents to test in the browser.
// Run with `dotnet run -- --seed-test-data`. Running it again keeps the data and resets the passwords.
public static class TestDataSeeder
{
    public const string Flag = "--seed-test-data";

    private const string CondominiumName = "Condomínio Teste Moraê";
    private const string Domain = "morae.local"; // .local never receives real e-mails

    private record TestAccount(string Key, string Label, string Email, string Name, string Role);

    private static readonly TestAccount[] Accounts =
    [
        new("MASTER", "MASTER — Plataforma (entra em /master/dashboard)", $"master.teste@{Domain}", "Master Teste", AppRoles.Master),
        new("ADMIN", $"ADMIN — {CondominiumName} (entra em /admin/dashboard)", $"admin.teste@{Domain}", "Admin Teste", AppRoles.Admin),
        new("SINDICO", $"SINDICO — {CondominiumName} · Torre A · unid. 201 (entra em /syndic/dashboard)", $"sindico.teste@{Domain}", "Síndico Teste", AppRoles.Syndic),
        new("MORADOR", $"MORADOR — {CondominiumName} · Torre A · unid. 101 (entra em /resident/dashboard)", $"morador.teste@{Domain}", "Morador Teste", AppRoles.Resident),
    ];

    public static async Task SeedAsync(AppDbContext context, UserManager<ApplicationUser> userManager, string contentRootPath)
    {
        var passwords = Accounts.ToDictionary(account => account.Key, _ => NewPassword());

        var condominiumExists = await context.Condominiums.AnyAsync(c => c.Name == CondominiumName);

        if (condominiumExists)
        {
            foreach (var account in Accounts)
            {
                var user = await userManager.FindByEmailAsync(account.Email)
                    ?? throw new InvalidOperationException($"Conta {account.Email} não encontrada. Apague o condomínio de teste e rode de novo.");

                var token = await userManager.GeneratePasswordResetTokenAsync(user);
                EnsureSucceeded(await userManager.ResetPasswordAsync(user, token, passwords[account.Key]));
                await userManager.SetLockoutEndDateAsync(user, null);
                await userManager.ResetAccessFailedCountAsync(user);
            }

            WriteAccountsFile(contentRootPath, passwords);
            Console.WriteLine("Condomínio de teste já existia: senhas redefinidas em .env.test-accounts.");
            return;
        }

        await using var transaction = await context.Database.BeginTransactionAsync();

        var cpfs = new CpfGenerator(context);
        var users = new Dictionary<string, ApplicationUser>();

        foreach (var account in Accounts)
        {
            var person = new Person
            {
                Name = account.Name,
                CPF = await cpfs.NextAsync(),
                PhoneNumber = "11900000000",
                Email = account.Email
            };
            context.Persons.Add(person);
            await context.SaveChangesAsync();

            var user = new ApplicationUser { UserName = account.Email, Email = account.Email, EmailConfirmed = true, PersonId = person.Id };
            EnsureSucceeded(await userManager.CreateAsync(user, passwords[account.Key]));
            EnsureSucceeded(await userManager.AddToRoleAsync(user, account.Role));
            users[account.Key] = user;
        }

        var master = users["MASTER"];

        var condominium = new Condominium
        {
            Name = CondominiumName,
            CNPJ = "00000000000191",
            CEP = "01310100",
            Number = "1000",
            Address = "Avenida Paulista",
            City = "São Paulo",
            State = "SP",
            EmailContact = $"contato.teste@{Domain}",
            CreatedByUserId = master.Id,
            LateFeeEnabled = true
        };
        context.Condominiums.Add(condominium);
        await context.SaveChangesAsync();

        // Torre A: 4 floors x 4 units (101..404). Torre B: 3 floors x 4 units (101..304).
        var towerA = new Building { CondominiumId = condominium.Id, Name = "Torre A", Code = "A", FloorCount = 4, HasElevator = true };
        var towerB = new Building { CondominiumId = condominium.Id, Name = "Torre B", Code = "B", FloorCount = 3, HasElevator = false };
        context.Buildings.AddRange(towerA, towerB);
        await context.SaveChangesAsync();

        var units = new List<Unit>();
        foreach (var (building, floors) in new[] { (towerA, 4), (towerB, 3) })
        {
            for (var floor = 1; floor <= floors; floor++)
            {
                for (var position = 1; position <= 4; position++)
                {
                    units.Add(new Unit
                    {
                        BuildingId = building.Id,
                        Building = building,
                        Number = $"{floor}0{position}",
                        UnitType = UnitType.Apartment,
                        Rooms = 2,
                        Bathrooms = 1,
                        SquareMeters = 62
                    });
                }
            }
        }
        context.Units.AddRange(units);
        await context.SaveChangesAsync();

        Unit UnitOf(Building building, string number) => units.First(u => u.BuildingId == building.Id && u.Number == number);

        // Every unit gets someone linked (no login), except the ones taken by the test accounts.
        var adminUser = users["ADMIN"];
        var syndicUser = users["SINDICO"];
        var residentUser = users["MORADOR"];
        var links = new List<(int PersonId, Unit Unit)>
        {
            (residentUser.PersonId, UnitOf(towerA, "101")),
            (syndicUser.PersonId, UnitOf(towerA, "201"))
        };

        var index = 1;
        foreach (var unit in units.Where(u => !links.Any(link => link.Unit == u)))
        {
            var person = new Person
            {
                Name = $"Morador Teste {index:00}",
                CPF = await cpfs.NextAsync(),
                PhoneNumber = $"119{index:00000000}",
                CreatedByUserId = adminUser.Id
            };
            context.Persons.Add(person);
            await context.SaveChangesAsync();
            links.Add((person.Id, unit));
            index++;
        }

        foreach (var (personId, unit) in links)
        {
            context.PersonUnits.Add(new PersonUnit { PersonId = personId, UnitId = unit.Id, RelationshipType = UnitRelationshipType.Owner });
            context.PersonCondominiums.Add(new PersonCondominium { PersonId = personId, CondominiumId = condominium.Id });
        }
        foreach (var user in new[] { adminUser })
            context.PersonCondominiums.Add(new PersonCondominium { PersonId = user.PersonId, CondominiumId = condominium.Id });

        // Roles inside the condominium, like an accepted invitation. The syndic only manages Torre A.
        context.UserCondominiums.Add(new UserCondominium { UserId = adminUser.Id, CondominiumId = condominium.Id, Role = AppRoles.Admin });
        context.UserCondominiums.Add(new UserCondominium { UserId = residentUser.Id, CondominiumId = condominium.Id, Role = AppRoles.Resident });
        context.UserCondominiums.Add(new UserCondominium
        {
            UserId = syndicUser.Id,
            CondominiumId = condominium.Id,
            Role = AppRoles.Syndic,
            ManagesAllBuildings = false,
            Buildings = [new UserCondominiumBuilding { BuildingId = towerA.Id }],
            Permissions = AppPermissions.All.Select(key => new UserCondominiumPermission { PermissionKey = key }).ToList()
        });
        await context.SaveChangesAsync();

        // This month's fee for every unit: most paid, some pending, a few overdue (last month).
        var today = AppTimeZone.Today;
        var thisMonthDue = new DateTime(today.Year, today.Month, condominium.BillingDueDay);
        var lastMonthDue = thisMonthDue.AddMonths(-1);

        for (var i = 0; i < units.Count; i++)
        {
            var unit = units[i];
            var overdue = i % 7 == 3;
            var dueDate = overdue ? lastMonthDue : thisMonthDue;
            var charge = new Charge
            {
                Scope = ChargeScope.Condominium,
                CreatedByUserId = adminUser.Id,
                CondominiumId = condominium.Id,
                UnitId = unit.Id,
                Value = 650m,
                DueDate = dueDate,
                Description = $"Taxa condominial {dueDate:MM/yyyy}",
                ReferenceMonth = new DateOnly(dueDate.Year, dueDate.Month, 1),
                FinePercent = condominium.FinePercent,
                MonthlyInterestPercent = condominium.MonthlyInterestPercent,
                Status = overdue ? ChargeStatus.Overdue : i % 3 == 0 ? ChargeStatus.Pending : ChargeStatus.Paid
            };
            context.Charges.Add(charge);

            if (charge.Status == ChargeStatus.Paid)
            {
                context.Payments.Add(new Payment
                {
                    Charge = charge,
                    AmountPaid = charge.Value,
                    PaymentMethod = PaymentMethod.Pix,
                    Source = PaymentSource.Manual,
                    RegisteredByUserId = adminUser.Id,
                    PaidAt = DateTime.UtcNow.AddDays(-2)
                });
            }
        }
        await context.SaveChangesAsync();

        await transaction.CommitAsync();

        WriteAccountsFile(contentRootPath, passwords);
        Console.WriteLine($"Condomínio de teste criado ({units.Count} unidades). Contas em .env.test-accounts.");
    }

    private static void WriteAccountsFile(string contentRootPath, Dictionary<string, string> passwords)
    {
        var text = new StringBuilder();
        text.AppendLine("# Contas de teste (geradas por `dotnet run -- --seed-test-data`). Não versionar.");
        foreach (var account in Accounts)
        {
            text.AppendLine();
            text.AppendLine($"# {account.Label}");
            text.AppendLine($"{account.Key}_EMAIL={account.Email}");
            text.AppendLine($"{account.Key}_SENHA={passwords[account.Key]}");
        }

        File.WriteAllText(Path.Combine(contentRootPath, ".env.test-accounts"), text.ToString());
    }

    // 8+ chars with a digit, as the Identity options require.
    private static string NewPassword() => $"Teste@{Convert.ToHexString(RandomNumberGenerator.GetBytes(4)).ToLowerInvariant()}1";

    private static void EnsureSucceeded(IdentityResult result)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join(" | ", result.Errors.Select(e => e.Description)));
    }

    // Valid CPFs (with check digits) that aren't in the database yet.
    private sealed class CpfGenerator(AppDbContext context)
    {
        private readonly HashSet<string> _used = [];

        public async Task<string> NextAsync()
        {
            while (true)
            {
                var digits = Enumerable.Range(0, 9).Select(_ => RandomNumberGenerator.GetInt32(10)).ToList();
                if (digits.Distinct().Count() == 1)
                    continue;

                digits.Add(CheckDigit(digits));
                digits.Add(CheckDigit(digits));
                var cpf = string.Concat(digits);

                if (_used.Add(cpf) && !await context.Persons.AnyAsync(p => p.CPF == cpf))
                    return cpf;
            }
        }

        private static int CheckDigit(List<int> digits)
        {
            var sum = digits.Select((digit, i) => digit * (digits.Count + 1 - i)).Sum();
            var rest = sum % 11;
            return rest < 2 ? 0 : 11 - rest;
        }
    }
}
