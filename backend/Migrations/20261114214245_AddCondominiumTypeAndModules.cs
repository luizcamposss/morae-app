using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCondominiumTypeAndModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EnabledModules",
                table: "Condominiums",
                type: "varchar(300)",
                maxLength: 300,
                nullable: false,
                // Existing condominiums keep every module they have today.
                defaultValue: "occurrences,visitors,maintenance,documents,assemblies,reservations,agreements,expenses")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Condominiums",
                type: "int",
                nullable: false,
                // Residential
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EnabledModules",
                table: "Condominiums");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Condominiums");
        }
    }
}
