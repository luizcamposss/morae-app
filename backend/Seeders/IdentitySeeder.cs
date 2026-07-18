using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Constants;
using backend.Data;
using backend.Enums;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Seeders;

public class IdentitySeeder
{
    private const string DemoCondominiumCnpj = "11111111000111";
    private const string DemoBuildingCode = "BLOCO-A";
    private const string DemoUnitNumber = "101";

    public static async Task SeedRolesAsync(RoleManager<IdentityRole<int>> roleManager)
    {
        string[] roles =
        {
            AppRoles.Master,
            AppRoles.Admin,
            AppRoles.Syndic,
            AppRoles.Resident,
        };

        foreach (var role in roles)
        {
            var exists = await roleManager.RoleExistsAsync(role);

            if (!exists)
            {
                await roleManager.CreateAsync(new IdentityRole<int>(role));
            }
        }
    }
    public static async Task SeedMasterAsync(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration)
    {
        var masterEmail = configuration["MasterUser:Email"];
        var masterPassword = configuration["MasterUser:Password"];

        if (string.IsNullOrWhiteSpace(masterEmail) || string.IsNullOrWhiteSpace(masterPassword))
            throw new InvalidOperationException("Master user credentials not configured.");

        var masterAlreadyExists = await userManager.Users
            .AnyAsync(u => u.Email == masterEmail);

        if (masterAlreadyExists)
            return;

        await using var transaction = await context.Database.BeginTransactionAsync();

        var person = new Person
        {
            Name = "Elvis Tamagno",
            CPF = "00000000000",
            PhoneNumber = "00000000000",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Persons.Add(person);
        await context.SaveChangesAsync();

        var user = new ApplicationUser
        {
            UserName = masterEmail,
            Email = masterEmail,
            PersonId = person.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user, masterPassword);

        if (!result.Succeeded)
            throw new Exception(string.Join(" | ", result.Errors.Select(e => e.Description)));

        var roleResult = await userManager.AddToRoleAsync(user, AppRoles.Master);

        if (!roleResult.Succeeded)
            throw new Exception(string.Join(" | ", roleResult.Errors.Select(e => e.Description)));

        person.CreatedByUserId = user.Id;
        await context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public static async Task SeedDemoUsersAsync(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration)
    {
        var masterEmail = configuration["MasterUser:Email"];

        if (string.IsNullOrWhiteSpace(masterEmail))
            throw new InvalidOperationException("Master user credentials not configured.");

        var masterUser = await userManager.Users.FirstOrDefaultAsync(u => u.Email == masterEmail);

        if (masterUser is null)
            throw new InvalidOperationException("Master user not found for demo seeding.");

        await using var transaction = await context.Database.BeginTransactionAsync();

        var condominium = await EnsureDemoCondominiumAsync(context, masterUser.Id);
        var building = await EnsureDemoBuildingAsync(context, condominium.Id);
        var unit = await EnsureDemoUnitAsync(context, building.Id);

        var adminUser = await EnsureDemoUserAsync(
            context,
            userManager,
            configuration["SeedUsers:Admin:Email"] ?? "admin@morae.com",
            configuration["SeedUsers:Admin:Password"] ?? "Admin12345!",
            "Admin Demo",
            "11111111111",
            "11911111111",
            AppRoles.Admin);

        await EnsureUserCondominiumAsync(context, adminUser.Id, condominium.Id, AppRoles.Admin);

        var syndicUser = await EnsureDemoUserAsync(
            context,
            userManager,
            configuration["SeedUsers:Syndic:Email"] ?? "syndic@morae.com",
            configuration["SeedUsers:Syndic:Password"] ?? "Syndic12345!",
            "Syndic Demo",
            "22222222222",
            "11922222222",
            AppRoles.Syndic);

        await EnsureUserCondominiumAsync(context, syndicUser.Id, condominium.Id, AppRoles.Syndic);

        var residentUser = await EnsureDemoUserAsync(
            context,
            userManager,
            configuration["SeedUsers:Resident:Email"] ?? "resident@morae.com",
            configuration["SeedUsers:Resident:Password"] ?? "Resident12345!",
            "Resident Demo",
            "33333333333",
            "11933333333",
            AppRoles.Resident);

        await EnsureUserCondominiumAsync(context, residentUser.Id, condominium.Id, AppRoles.Resident);
        await EnsurePersonCondominiumAsync(context, residentUser.PersonId, condominium.Id);
        await EnsureResidentUnitAsync(context, residentUser.PersonId, unit.Id);

        await transaction.CommitAsync();
    }

    private static async Task<Condominium> EnsureDemoCondominiumAsync(AppDbContext context, int masterUserId)
    {
        var condominium = await context.Condominiums
            .FirstOrDefaultAsync(c => c.CNPJ == DemoCondominiumCnpj);

        if (condominium is not null)
            return condominium;

        condominium = new Condominium
        {
            Name = "Condominio Demo Morae",
            CNPJ = DemoCondominiumCnpj,
            Number = "100",
            Address = "Rua das Palmeiras",
            City = "Sao Paulo",
            State = "SP",
            EmailContact = "contato@condominiodemo.com",
            Status = Status.Active,
            CreatedByUserId = masterUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Condominiums.Add(condominium);
        await context.SaveChangesAsync();

        return condominium;
    }

    private static async Task<Building> EnsureDemoBuildingAsync(AppDbContext context, int condominiumId)
    {
        var building = await context.Buildings
            .FirstOrDefaultAsync(b =>
                b.CondominiumId == condominiumId &&
                b.Code == DemoBuildingCode);

        if (building is not null)
            return building;

        building = new Building
        {
            CondominiumId = condominiumId,
            Name = "Predio A",
            Code = DemoBuildingCode,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Buildings.Add(building);
        await context.SaveChangesAsync();

        return building;
    }

    private static async Task<Unit> EnsureDemoUnitAsync(AppDbContext context, int buildingId)
    {
        var unit = await context.Units
            .FirstOrDefaultAsync(u =>
                u.BuildingId == buildingId &&
                u.Number == DemoUnitNumber);

        if (unit is not null)
            return unit;

        unit = new Unit
        {
            BuildingId = buildingId,
            Number = DemoUnitNumber,
            UnitType = UnitType.Apartment,
            Rooms = 3,
            Bathrooms = 2,
            SquareMeters = 78,
            Observations = "Unidade demo criada para testes",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Units.Add(unit);
        await context.SaveChangesAsync();

        return unit;
    }

    private static async Task<ApplicationUser> EnsureDemoUserAsync(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        string email,
        string password,
        string personName,
        string cpf,
        string phoneNumber,
        string role)
    {
        var existingUser = await userManager.Users
            .Include(u => u.Person)
            .FirstOrDefaultAsync(u => u.Email == email);

        if (existingUser is not null)
        {
            if (!await userManager.IsInRoleAsync(existingUser, role))
            {
                var addRoleResult = await userManager.AddToRoleAsync(existingUser, role);

                if (!addRoleResult.Succeeded)
                    throw new Exception(string.Join(" | ", addRoleResult.Errors.Select(e => e.Description)));
            }

            return existingUser;
        }

        var person = await context.Persons.FirstOrDefaultAsync(p => p.CPF == cpf);

        if (person is null)
        {
            person = new Person
            {
                Name = personName,
                CPF = cpf,
                PhoneNumber = phoneNumber,
                CreatedByUserId = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Persons.Add(person);
            await context.SaveChangesAsync();
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            PersonId = person.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var createResult = await userManager.CreateAsync(user, password);

        if (!createResult.Succeeded)
            throw new Exception(string.Join(" | ", createResult.Errors.Select(e => e.Description)));

        var roleResult = await userManager.AddToRoleAsync(user, role);

        if (!roleResult.Succeeded)
            throw new Exception(string.Join(" | ", roleResult.Errors.Select(e => e.Description)));

        return user;
    }

    private static async Task EnsureUserCondominiumAsync(
        AppDbContext context,
        int userId,
        int condominiumId,
        string role)
    {
        var existingLink = await context.UserCondominiums
            .FirstOrDefaultAsync(uc =>
                uc.UserId == userId &&
                uc.CondominiumId == condominiumId);

        if (existingLink is not null)
        {
            existingLink.Role = role;
            existingLink.Status = UserCondominiumStatus.Active;
            existingLink.SuspendedAt = null;
            existingLink.SuspendedByUserId = null;
            existingLink.SuspensionReason = string.Empty;
            await context.SaveChangesAsync();
            return;
        }

        context.UserCondominiums.Add(new UserCondominium
        {
            UserId = userId,
            CondominiumId = condominiumId,
            Role = role,
            Status = UserCondominiumStatus.Active,
            CreatedAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }

    private static async Task EnsureResidentUnitAsync(AppDbContext context, int personId, int unitId)
    {
        var existingRelation = await context.PersonUnits
            .FirstOrDefaultAsync(pu =>
                pu.PersonId == personId &&
                pu.UnitId == unitId &&
                pu.RelationshipType == UnitRelationshipType.Resident);

        if (existingRelation is not null)
            return;

        context.PersonUnits.Add(new PersonUnit
        {
            PersonId = personId,
            UnitId = unitId,
            RelationshipType = UnitRelationshipType.Resident,
            CreatedAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }

    private static async Task EnsurePersonCondominiumAsync(AppDbContext context, int personId, int condominiumId)
    {
        var existingLink = await context.PersonCondominiums
            .FirstOrDefaultAsync(personCondominium =>
                personCondominium.PersonId == personId &&
                personCondominium.CondominiumId == condominiumId);

        if (existingLink is not null)
            return;

        context.PersonCondominiums.Add(new PersonCondominium
        {
            PersonId = personId,
            CondominiumId = condominiumId,
            CreatedAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }
}
