using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCondominiumBillsPayer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CondominiumBillsPaidBy",
                table: "RentalContracts",
                type: "int",
                nullable: false,
                // Tenant: the usual case, and what every existing contract did for water, light and gas.
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CondominiumBillsPaidBy",
                table: "RentalContracts");
        }
    }
}
