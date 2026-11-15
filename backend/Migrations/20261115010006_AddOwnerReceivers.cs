using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddOwnerReceivers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReceiverPersonId",
                table: "RentalContracts",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OwnerPersonId",
                table: "MercadoPagoOAuthStates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OwnerPersonId",
                table: "MercadoPagoAccounts",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReceiverPersonId",
                table: "Charges",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RentalContracts_ReceiverPersonId",
                table: "RentalContracts",
                column: "ReceiverPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_MercadoPagoAccounts_OwnerPersonId",
                table: "MercadoPagoAccounts",
                column: "OwnerPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_Charges_ReceiverPersonId",
                table: "Charges",
                column: "ReceiverPersonId");

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_Persons_ReceiverPersonId",
                table: "Charges",
                column: "ReceiverPersonId",
                principalTable: "Persons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MercadoPagoAccounts_Persons_OwnerPersonId",
                table: "MercadoPagoAccounts",
                column: "OwnerPersonId",
                principalTable: "Persons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RentalContracts_Persons_ReceiverPersonId",
                table: "RentalContracts",
                column: "ReceiverPersonId",
                principalTable: "Persons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Charges_Persons_ReceiverPersonId",
                table: "Charges");

            migrationBuilder.DropForeignKey(
                name: "FK_MercadoPagoAccounts_Persons_OwnerPersonId",
                table: "MercadoPagoAccounts");

            migrationBuilder.DropForeignKey(
                name: "FK_RentalContracts_Persons_ReceiverPersonId",
                table: "RentalContracts");

            migrationBuilder.DropIndex(
                name: "IX_RentalContracts_ReceiverPersonId",
                table: "RentalContracts");

            migrationBuilder.DropIndex(
                name: "IX_MercadoPagoAccounts_OwnerPersonId",
                table: "MercadoPagoAccounts");

            migrationBuilder.DropIndex(
                name: "IX_Charges_ReceiverPersonId",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "ReceiverPersonId",
                table: "RentalContracts");

            migrationBuilder.DropColumn(
                name: "OwnerPersonId",
                table: "MercadoPagoOAuthStates");

            migrationBuilder.DropColumn(
                name: "OwnerPersonId",
                table: "MercadoPagoAccounts");

            migrationBuilder.DropColumn(
                name: "ReceiverPersonId",
                table: "Charges");
        }
    }
}
