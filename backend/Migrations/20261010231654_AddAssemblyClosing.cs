using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssemblyClosing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ClosingReminderSentAt",
                table: "Assemblies",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EligibleUnitsCount",
                table: "Assemblies",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinutesDocumentId",
                table: "Assemblies",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assemblies_MinutesDocumentId",
                table: "Assemblies",
                column: "MinutesDocumentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assemblies_Documents_MinutesDocumentId",
                table: "Assemblies",
                column: "MinutesDocumentId",
                principalTable: "Documents",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assemblies_Documents_MinutesDocumentId",
                table: "Assemblies");

            migrationBuilder.DropIndex(
                name: "IX_Assemblies_MinutesDocumentId",
                table: "Assemblies");

            migrationBuilder.DropColumn(
                name: "ClosingReminderSentAt",
                table: "Assemblies");

            migrationBuilder.DropColumn(
                name: "EligibleUnitsCount",
                table: "Assemblies");

            migrationBuilder.DropColumn(
                name: "MinutesDocumentId",
                table: "Assemblies");
        }
    }
}
