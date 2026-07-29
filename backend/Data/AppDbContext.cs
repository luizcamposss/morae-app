using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Enums;
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
    public DbSet<PersonCondominium> PersonCondominiums { get; set; }
    public DbSet<Condominium> Condominiums { get; set; }
    public DbSet<Building> Buildings { get; set; }
    public DbSet<Unit> Units { get; set; }
    public DbSet<PersonUnit> PersonUnits { get; set; }
    public DbSet<News> News { get; set; }
    public DbSet<Invitation> Invitations { get; set; }
    public DbSet<Charge> Charges { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<FinancialAccount> FinancialAccounts { get; set; }
    public DbSet<UserNotificationPreference> UserNotificationPreferences { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<UserCondominium> UserCondominiums { get; set; }
    public DbSet<UserCondominiumPermission> UserCondominiumPermissions { get; set; }
    public DbSet<Occurrence> Occurrences { get; set; }
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>()
            .HasOne(u => u.Person)
            .WithOne(p => p.User)
            .HasForeignKey<ApplicationUser>(u => u.PersonId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Condominium>()
            .HasIndex(c => c.CNPJ)
            .IsUnique();

        builder.Entity<Condominium>()
            .HasOne(c => c.CreatedByUser)
            .WithMany()
            .HasForeignKey(c => c.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Condominium>()
            .HasMany(b => b.Buildings)
            .WithOne(c => c.Condominium)
            .HasForeignKey(c => c.CondominiumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Building>()
            .HasMany(b => b.Units)
            .WithOne(c => c.Building)
            .HasForeignKey(c => c.BuildingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Building>()
            .HasIndex(b => new { b.CondominiumId, b.Code })
            .IsUnique();

        builder.Entity<Unit>()
            .HasIndex(u => new { u.BuildingId, u.Number })
            .IsUnique();

        builder.Entity<Person>()
            .HasIndex(p => p.CPF)
            .IsUnique();

        builder.Entity<Person>()
            .Property(p => p.ProfilePhotoUrl)
            .HasColumnType("longtext");

        builder.Entity<Person>()
            .HasOne(p => p.CreatedByUser)
            .WithMany()
            .HasForeignKey(p => p.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<PersonCondominium>()
            .HasIndex(pc => new { pc.PersonId, pc.CondominiumId })
            .IsUnique();

        builder.Entity<PersonCondominium>()
            .HasOne(pc => pc.Person)
            .WithMany(p => p.PersonCondominiums)
            .HasForeignKey(pc => pc.PersonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PersonCondominium>()
            .HasOne(pc => pc.Condominium)
            .WithMany(c => c.PersonCondominiums)
            .HasForeignKey(pc => pc.CondominiumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PersonUnit>()
            .HasIndex(pu => new
            {
                pu.PersonId,
                pu.UnitId,
                pu.RelationshipType
            })
            .IsUnique();

        builder.Entity<UserCondominium>()
            .HasIndex(uc => new { uc.UserId, uc.CondominiumId })
            .IsUnique();

        builder.Entity<UserCondominium>()
            .HasOne(uc => uc.User)
            .WithMany(u => u.UserCondominiums)
            .HasForeignKey(uc => uc.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserCondominium>()
            .HasOne(uc => uc.Condominium)
            .WithMany(c => c.UserCondominiums)
            .HasForeignKey(uc => uc.CondominiumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserCondominium>()
            .Property(uc => uc.Status)
            .HasDefaultValue(UserCondominiumStatus.Active);

        builder.Entity<UserCondominium>()
            .HasOne(uc => uc.SuspendedByUser)
            .WithMany()
            .HasForeignKey(uc => uc.SuspendedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<UserCondominiumPermission>()
            .HasIndex(p => new { p.UserCondominiumId, p.PermissionKey })
            .IsUnique();

        builder.Entity<UserCondominiumPermission>()
            .HasOne(p => p.UserCondominium)
            .WithMany(uc => uc.Permissions)
            .HasForeignKey(p => p.UserCondominiumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Charge>()
            .HasOne(c => c.CreatedByUser)
            .WithMany()
            .HasForeignKey(c => c.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Charge>()
            .HasOne(c => c.TargetUser)
            .WithMany()
            .HasForeignKey(c => c.TargetUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Charge>()
            .HasOne(c => c.Condominium)
            .WithMany()
            .HasForeignKey(c => c.CondominiumId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Charge>()
            .HasOne(c => c.Unit)
            .WithMany()
            .HasForeignKey(c => c.UnitId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Charge>()
            .Property(c => c.Value)
            .HasPrecision(10, 2);

        builder.Entity<Payment>()
            .HasOne(p => p.RegisteredByUser)
            .WithMany()
            .HasForeignKey(p => p.RegisteredByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Payment>()
            .Property(p => p.AmountPaid)
            .HasPrecision(10, 2);

        builder.Entity<FinancialAccount>()
            .HasIndex(account => new { account.Scope, account.CondominiumId })
            .IsUnique();

        builder.Entity<FinancialAccount>()
            .HasOne(account => account.Condominium)
            .WithMany()
            .HasForeignKey(account => account.CondominiumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<FinancialAccount>()
            .HasOne(account => account.UpdatedByUser)
            .WithMany()
            .HasForeignKey(account => account.UpdatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<UserNotificationPreference>()
            .HasIndex(preference => preference.UserId)
            .IsUnique();

        builder.Entity<UserNotificationPreference>()
            .HasOne(preference => preference.User)
            .WithMany()
            .HasForeignKey(preference => preference.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Notification>()
            .HasOne(notification => notification.User)
            .WithMany()
            .HasForeignKey(notification => notification.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Notification>()
            .HasOne(notification => notification.Condominium)
            .WithMany()
            .HasForeignKey(notification => notification.CondominiumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Notification>()
            .HasIndex(notification => new
            {
                notification.UserId,
                notification.ReadAt,
                notification.CreatedAt
            });

        builder.Entity<Occurrence>()
            .HasOne(o => o.Condominium)
            .WithMany()
            .HasForeignKey(o => o.CondominiumId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Occurrence>()
            .HasOne(o => o.Unit)
            .WithMany()
            .HasForeignKey(o => o.UnitId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Occurrence>()
            .HasOne(o => o.CreatedByUser)
            .WithMany()
            .HasForeignKey(o => o.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
