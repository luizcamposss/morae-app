using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Constants;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Seeders;

public class IdentitySeeder
{
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
        var masterPassword = configuration["MasterPassword:Password"];

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

        await transaction.CommitAsync();
    }
}