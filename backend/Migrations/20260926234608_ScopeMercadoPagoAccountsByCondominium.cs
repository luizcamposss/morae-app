using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class ScopeMercadoPagoAccountsByCondominium : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing connections were stored per user, with plain-text tokens, and cannot be
            // mapped to a platform or condominium account. They are sandbox data: drop them
            // and connect the accounts again.
            migrationBuilder.Sql("DELETE FROM MercadoPagoPayments;");
            migrationBuilder.Sql("DELETE FROM MercadoPagoAccounts;");
            migrationBuilder.Sql("DELETE FROM MercadoPagoOAuthStates;");

            // MySQL error 1553: the index backing FK_MercadoPagoAccounts_AspNetUsers_UserId
            // cannot be dropped before another index on UserId exists.
            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoAccounts_UserId_Temp",
                table: "MercadoPagoAccounts",
                column: "UserId");

            migrationBuilder.DropIndex(
                name: "IX_MercadoPagoAccounts_UserId",
                table: "MercadoPagoAccounts");

            migrationBuilder.RenameIndex(
                name: "IX_MercadoPagoAccounts_UserId_Temp",
                table: "MercadoPagoAccounts",
                newName: "IX_MercadoPagoAccounts_UserId");

            migrationBuilder.AddColumn<int>(
                name: "CondominiumId",
                table: "MercadoPagoOAuthStates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CondominiumId",
                table: "MercadoPagoAccounts",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoAccounts_CondominiumId",
                table: "MercadoPagoAccounts",
                column: "CondominiumId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MercadoPagoAccounts_Condominiums_CondominiumId",
                table: "MercadoPagoAccounts",
                column: "CondominiumId",
                principalTable: "Condominiums",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MercadoPagoAccounts_Condominiums_CondominiumId",
                table: "MercadoPagoAccounts");

            migrationBuilder.DropIndex(
                name: "IX_MercadoPagoAccounts_CondominiumId",
                table: "MercadoPagoAccounts");

            migrationBuilder.DropColumn(
                name: "CondominiumId",
                table: "MercadoPagoOAuthStates");

            migrationBuilder.DropColumn(
                name: "CondominiumId",
                table: "MercadoPagoAccounts");

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoAccounts_UserId_Temp",
                table: "MercadoPagoAccounts",
                column: "UserId",
                unique: true);

            migrationBuilder.DropIndex(
                name: "IX_MercadoPagoAccounts_UserId",
                table: "MercadoPagoAccounts");

            migrationBuilder.RenameIndex(
                name: "IX_MercadoPagoAccounts_UserId_Temp",
                table: "MercadoPagoAccounts",
                newName: "IX_MercadoPagoAccounts_UserId");
        }
    }
}
