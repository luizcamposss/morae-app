using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Constants;
using Microsoft.AspNetCore.Identity;

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
}