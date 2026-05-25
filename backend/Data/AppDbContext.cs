using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<int>, int>
{
    public AppDbContext(DbContextOptions<AppDbContext> opts) : base(opts)
    {
        
    }
    public DbSet<Person> Persons { get; set; }
    public DbSet<Condominium> Condominiums { get; set; }
    public DbSet<Building> Buildings { get; set; }
    public DbSet<Unit> Units { get; set; }
    public DbSet<PersonUnit> PersonUnits { get; set; }
    public DbSet<News> News { get; set; }
    public DbSet<Invitation> Invitations { get; set; }
    public DbSet<Charge> Charges { get; set; }
    public DbSet<Payment> Payments { get; set; }
}