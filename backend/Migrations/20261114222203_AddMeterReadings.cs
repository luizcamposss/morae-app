using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddMeterReadings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MeterReadings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CondominiumId = table.Column<int>(type: "int", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<DateOnly>(type: "date", nullable: false),
                    PreviousReading = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false),
                    CurrentReading = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false),
                    Consumption = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    ChargeItemId = table.Column<int>(type: "int", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeterReadings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeterReadings_Condominiums_CondominiumId",
                        column: x => x.CondominiumId,
                        principalTable: "Condominiums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeterReadings_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "UtilityRates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CondominiumId = table.Column<int>(type: "int", nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Enabled = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    PricePerUnit = table.Column<decimal>(type: "decimal(10,4)", precision: 10, scale: 4, nullable: false),
                    MinimumCharge = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilityRates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilityRates_Condominiums_CondominiumId",
                        column: x => x.CondominiumId,
                        principalTable: "Condominiums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_MeterReadings_CondominiumId",
                table: "MeterReadings",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_MeterReadings_UnitId_Category_Month",
                table: "MeterReadings",
                columns: new[] { "UnitId", "Category", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UtilityRates_CondominiumId_Category",
                table: "UtilityRates",
                columns: new[] { "CondominiumId", "Category" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeterReadings");

            migrationBuilder.DropTable(
                name: "UtilityRates");
        }
    }
}
