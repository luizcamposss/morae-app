using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddMaintenanceReminderTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "OverdueReminderSentFor",
                table: "MaintenancePlans",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "Reminder30SentFor",
                table: "MaintenancePlans",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "Reminder7SentFor",
                table: "MaintenancePlans",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OverdueReminderSentFor",
                table: "MaintenancePlans");

            migrationBuilder.DropColumn(
                name: "Reminder30SentFor",
                table: "MaintenancePlans");

            migrationBuilder.DropColumn(
                name: "Reminder7SentFor",
                table: "MaintenancePlans");
        }
    }
}
