using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateChargeValuePrecision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Charges_Units_UnitId",
                table: "Charges");

            migrationBuilder.AlterColumn<decimal>(
                name: "Value",
                table: "Charges",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(65,30)");

            migrationBuilder.AlterColumn<int>(
                name: "UnitId",
                table: "Charges",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "CancelReason",
                table: "Charges",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "CanceledAt",
                table: "Charges",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CondominiumId",
                table: "Charges",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "Charges",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "Charges",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TargetUserId",
                table: "Charges",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Charges_CondominiumId",
                table: "Charges",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_Charges_CreatedByUserId",
                table: "Charges",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Charges_TargetUserId",
                table: "Charges",
                column: "TargetUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_AspNetUsers_CreatedByUserId",
                table: "Charges",
                column: "CreatedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_AspNetUsers_TargetUserId",
                table: "Charges",
                column: "TargetUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_Condominiums_CondominiumId",
                table: "Charges",
                column: "CondominiumId",
                principalTable: "Condominiums",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_Units_UnitId",
                table: "Charges",
                column: "UnitId",
                principalTable: "Units",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Charges_AspNetUsers_CreatedByUserId",
                table: "Charges");

            migrationBuilder.DropForeignKey(
                name: "FK_Charges_AspNetUsers_TargetUserId",
                table: "Charges");

            migrationBuilder.DropForeignKey(
                name: "FK_Charges_Condominiums_CondominiumId",
                table: "Charges");

            migrationBuilder.DropForeignKey(
                name: "FK_Charges_Units_UnitId",
                table: "Charges");

            migrationBuilder.DropIndex(
                name: "IX_Charges_CondominiumId",
                table: "Charges");

            migrationBuilder.DropIndex(
                name: "IX_Charges_CreatedByUserId",
                table: "Charges");

            migrationBuilder.DropIndex(
                name: "IX_Charges_TargetUserId",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "CancelReason",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "CanceledAt",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "CondominiumId",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Charges");

            migrationBuilder.DropColumn(
                name: "TargetUserId",
                table: "Charges");

            migrationBuilder.AlterColumn<decimal>(
                name: "Value",
                table: "Charges",
                type: "decimal(65,30)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,2)",
                oldPrecision: 10,
                oldScale: 2);

            migrationBuilder.AlterColumn<int>(
                name: "UnitId",
                table: "Charges",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Charges_Units_UnitId",
                table: "Charges",
                column: "UnitId",
                principalTable: "Units",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
