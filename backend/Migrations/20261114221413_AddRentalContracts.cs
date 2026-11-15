using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRentalContracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RentalContracts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CondominiumId = table.Column<int>(type: "int", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: false),
                    TenantPersonId = table.Column<int>(type: "int", nullable: false),
                    MonthlyRent = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    DueDay = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IncludesWater = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IncludesElectricity = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IncludesGas = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IncludesCondominiumFee = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CondominiumFeeAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    AdjustmentIndex = table.Column<int>(type: "int", nullable: false),
                    NextAdjustmentDate = table.Column<DateOnly>(type: "date", nullable: true),
                    AdjustmentReminderSentFor = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    LastBilledMonth = table.Column<DateOnly>(type: "date", nullable: true),
                    EndReason = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EndedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalContracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RentalContracts_Condominiums_CondominiumId",
                        column: x => x.CondominiumId,
                        principalTable: "Condominiums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RentalContracts_Persons_TenantPersonId",
                        column: x => x.TenantPersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RentalContracts_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "RentalContractValueChanges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RentalContractId = table.Column<int>(type: "int", nullable: false),
                    PreviousValue = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    NewValue = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    ChangedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalContractValueChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RentalContractValueChanges_RentalContracts_RentalContractId",
                        column: x => x.RentalContractId,
                        principalTable: "RentalContracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_RentalContracts_CondominiumId",
                table: "RentalContracts",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_RentalContracts_TenantPersonId",
                table: "RentalContracts",
                column: "TenantPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_RentalContracts_UnitId_Status",
                table: "RentalContracts",
                columns: new[] { "UnitId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_RentalContractValueChanges_RentalContractId",
                table: "RentalContractValueChanges",
                column: "RentalContractId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RentalContractValueChanges");

            migrationBuilder.DropTable(
                name: "RentalContracts");
        }
    }
}
