using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddMercadoPagoPaymentTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Payments_ChargeId",
                table: "Payments");

            migrationBuilder.CreateTable(
                name: "MercadoPagoPayments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ChargeId = table.Column<int>(type: "int", nullable: false),
                    MercadoPagoAccountId = table.Column<int>(type: "int", nullable: false),
                    PaymentId = table.Column<int>(type: "int", nullable: true),
                    PreferenceId = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ExternalReference = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MercadoPagoPaymentId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StatusDetail = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PaymentMethodId = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PaymentTypeId = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Amount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MercadoPagoPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MercadoPagoPayments_Charges_ChargeId",
                        column: x => x.ChargeId,
                        principalTable: "Charges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MercadoPagoPayments_MercadoPagoAccounts_MercadoPagoAccountId",
                        column: x => x.MercadoPagoAccountId,
                        principalTable: "MercadoPagoAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MercadoPagoPayments_Payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "Payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ChargeId",
                table: "Payments",
                column: "ChargeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoPayments_ChargeId",
                table: "MercadoPagoPayments",
                column: "ChargeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoPayments_ExternalReference",
                table: "MercadoPagoPayments",
                column: "ExternalReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoPayments_MercadoPagoAccountId",
                table: "MercadoPagoPayments",
                column: "MercadoPagoAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoPayments_MercadoPagoPaymentId",
                table: "MercadoPagoPayments",
                column: "MercadoPagoPaymentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoPayments_PaymentId",
                table: "MercadoPagoPayments",
                column: "PaymentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoPayments_PreferenceId",
                table: "MercadoPagoPayments",
                column: "PreferenceId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MercadoPagoPayments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_ChargeId",
                table: "Payments");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ChargeId",
                table: "Payments",
                column: "ChargeId");
        }
    }
}
