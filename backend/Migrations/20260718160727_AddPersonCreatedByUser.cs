using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonCreatedByUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "Persons",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Persons_CreatedByUserId",
                table: "Persons",
                column: "CreatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Persons_AspNetUsers_CreatedByUserId",
                table: "Persons",
                column: "CreatedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Persons_AspNetUsers_CreatedByUserId",
                table: "Persons");

            migrationBuilder.DropIndex(
                name: "IX_Persons_CreatedByUserId",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Persons");
        }
    }
}
