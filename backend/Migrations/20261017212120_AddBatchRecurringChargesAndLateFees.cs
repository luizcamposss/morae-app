using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddBatchRecurringChargesAndLateFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BillingDueDay",
                table: "Condominiums",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<decimal>(
                name: "FinePercent",
                table: "Condominiums",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 2m);

            migrationBuilder.AddColumn<bool>(
                name: "LateFeeEnabled",
                table: "Condominiums",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyInterestPercent",
                table: "Condominiums",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<decimal>(
                name: "FinePercent",
                table: "Charges",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyInterestPercent",
                table: "Charges",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurringChargeId",
                table: "Charges",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "ReferenceMonth",
                table: "Charges",
                type: "date",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RecurringCharges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CondominiumId = table.Column<int>(type: "int", nullable: false),
                    BuildingId = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Value = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    DueDay = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringCharges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringCharges_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RecurringCharges_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RecurringCharges_Condominiums_CondominiumId",
                        column: x => x.CondominiumId,
                        principalTable: "Condominiums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "RecurringChargeUnitValues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RecurringChargeId = table.Column<int>(type: "int", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: false),
                    Value = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringChargeUnitValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringChargeUnitValues_RecurringCharges_RecurringChargeId",
                        column: x => x.RecurringChargeId,
                        principalTable: "RecurringCharges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecurringChargeUnitValues_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Charges_RecurringChargeId_UnitId_ReferenceMonth",
                table: "Charges",
                columns: new[] { "RecurringChargeId", "UnitId", "ReferenceMonth" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecurringCharges_BuildingId",
                table: "RecurringCharges",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringCharges_CondominiumId",
                table: "RecurringCharges",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringCharges_CreatedByUserId",
                table: "RecurringCharges",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringChargeUnitValues_RecurringChargeId_UnitId",
                table: "RecurringChargeUnitValues",
                columns: new[] { "RecurringChargeId", "UnitId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecurringChargeUnitValues_UnitId",
                table: "RecurringChargeUnitValues",
                column: "UnitId");

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_RecurringCharges_RecurringChargeId",
                table: "Charges",
                column: "RecurringChargeId",
                principalTable: "RecurringCharges",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Charges_RecurringCharges_RecurringChargeId",
                table: "Charges");

            migrationBuilder.DropTable(
                name: "RecurringChargeUnitValues");

            migrationBuilder.DropTable(
                name: "RecurringCharges");

            migrationBuilder.DropIndex(
                name: "IX_Charges_RecurringChargeId_UnitId_ReferenceMonth",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "BillingDueDay",
                table: "Condominiums");

            migrationBuilder.DropColumn(
                name: "FinePercent",
                table: "Condominiums");

            migrationBuilder.DropColumn(
                name: "LateFeeEnabled",
                table: "Condominiums");

            migrationBuilder.DropColumn(
                name: "MonthlyInterestPercent",
                table: "Condominiums");

            migrationBuilder.DropColumn(
                name: "FinePercent",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "MonthlyInterestPercent",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "RecurringChargeId",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "ReferenceMonth",
                table: "Charges");
        }
    }
}
