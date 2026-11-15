using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDebtAgreements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AgreementId",
                table: "Charges",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AgreementInstallmentNumber",
                table: "Charges",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Agreements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CondominiumId = table.Column<int>(type: "int", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: false),
                    RecipientPersonId = table.Column<int>(type: "int", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    OriginalAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    FineAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    InterestAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    DiscountType = table.Column<int>(type: "int", nullable: false),
                    DiscountValue = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    DownPayment = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    InstallmentCount = table.Column<int>(type: "int", nullable: false),
                    InstallmentDueDay = table.Column<int>(type: "int", nullable: false),
                    BreakAfterDaysLate = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    EndReason = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agreements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Agreements_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Agreements_Condominiums_CondominiumId",
                        column: x => x.CondominiumId,
                        principalTable: "Condominiums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Agreements_Persons_RecipientPersonId",
                        column: x => x.RecipientPersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Agreements_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AgreementCharges",
                columns: table => new
                {
                    AgreementId = table.Column<int>(type: "int", nullable: false),
                    ChargeId = table.Column<int>(type: "int", nullable: false),
                    Value = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    FineAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    InterestAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgreementCharges", x => new { x.AgreementId, x.ChargeId });
                    table.ForeignKey(
                        name: "FK_AgreementCharges_Agreements_AgreementId",
                        column: x => x.AgreementId,
                        principalTable: "Agreements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AgreementCharges_Charges_ChargeId",
                        column: x => x.ChargeId,
                        principalTable: "Charges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Charges_AgreementId",
                table: "Charges",
                column: "AgreementId");

            migrationBuilder.CreateIndex(
                name: "IX_AgreementCharges_ChargeId",
                table: "AgreementCharges",
                column: "ChargeId");

            migrationBuilder.CreateIndex(
                name: "IX_Agreements_CondominiumId_Status",
                table: "Agreements",
                columns: new[] { "CondominiumId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Agreements_CreatedByUserId",
                table: "Agreements",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Agreements_RecipientPersonId",
                table: "Agreements",
                column: "RecipientPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_Agreements_UnitId",
                table: "Agreements",
                column: "UnitId");

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_Agreements_AgreementId",
                table: "Charges",
                column: "AgreementId",
                principalTable: "Agreements",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Charges_Agreements_AgreementId",
                table: "Charges");

            migrationBuilder.DropTable(
                name: "AgreementCharges");

            migrationBuilder.DropTable(
                name: "Agreements");

            migrationBuilder.DropIndex(
                name: "IX_Charges_AgreementId",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "AgreementId",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "AgreementInstallmentNumber",
                table: "Charges");
        }
    }
}
