using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddChargeCategoryAndRecipient : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Category",
                table: "RecurringCharges",
                type: "int",
                nullable: false,
                // Existing charges and recurrences are condominium fees (ChargeCategory.CondominiumFee).
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "RecipientPersonId",
                table: "RecurringCharges",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UnitId",
                table: "RecurringCharges",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Category",
                table: "Charges",
                type: "int",
                nullable: false,
                // Existing charges and recurrences are condominium fees (ChargeCategory.CondominiumFee).
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "RecipientPersonId",
                table: "Charges",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecurringCharges_RecipientPersonId",
                table: "RecurringCharges",
                column: "RecipientPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringCharges_UnitId",
                table: "RecurringCharges",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Charges_RecipientPersonId",
                table: "Charges",
                column: "RecipientPersonId");

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_Persons_RecipientPersonId",
                table: "Charges",
                column: "RecipientPersonId",
                principalTable: "Persons",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringCharges_Persons_RecipientPersonId",
                table: "RecurringCharges",
                column: "RecipientPersonId",
                principalTable: "Persons",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringCharges_Units_UnitId",
                table: "RecurringCharges",
                column: "UnitId",
                principalTable: "Units",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Charges_Persons_RecipientPersonId",
                table: "Charges");

            migrationBuilder.DropForeignKey(
                name: "FK_RecurringCharges_Persons_RecipientPersonId",
                table: "RecurringCharges");

            migrationBuilder.DropForeignKey(
                name: "FK_RecurringCharges_Units_UnitId",
                table: "RecurringCharges");

            migrationBuilder.DropIndex(
                name: "IX_RecurringCharges_RecipientPersonId",
                table: "RecurringCharges");

            migrationBuilder.DropIndex(
                name: "IX_RecurringCharges_UnitId",
                table: "RecurringCharges");

            migrationBuilder.DropIndex(
                name: "IX_Charges_RecipientPersonId",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "RecurringCharges");

            migrationBuilder.DropColumn(
                name: "RecipientPersonId",
                table: "RecurringCharges");

            migrationBuilder.DropColumn(
                name: "UnitId",
                table: "RecurringCharges");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "RecipientPersonId",
                table: "Charges");
        }
    }
}
