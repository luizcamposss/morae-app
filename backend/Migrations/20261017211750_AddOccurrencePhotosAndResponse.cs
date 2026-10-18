using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddOccurrencePhotosAndResponse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ManagementResponse",
                table: "Occurrences",
                type: "varchar(2000)",
                maxLength: 2000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "RespondedAt",
                table: "Occurrences",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RespondedByUserId",
                table: "Occurrences",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OccurrencePhotos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    OccurrenceId = table.Column<int>(type: "int", nullable: false),
                    FileName = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ContentType = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    StorageKey = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OccurrencePhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OccurrencePhotos_Occurrences_OccurrenceId",
                        column: x => x.OccurrenceId,
                        principalTable: "Occurrences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Occurrences_RespondedByUserId",
                table: "Occurrences",
                column: "RespondedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OccurrencePhotos_OccurrenceId",
                table: "OccurrencePhotos",
                column: "OccurrenceId");

            migrationBuilder.AddForeignKey(
                name: "FK_Occurrences_AspNetUsers_RespondedByUserId",
                table: "Occurrences",
                column: "RespondedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Occurrences_AspNetUsers_RespondedByUserId",
                table: "Occurrences");

            migrationBuilder.DropTable(
                name: "OccurrencePhotos");

            migrationBuilder.DropIndex(
                name: "IX_Occurrences_RespondedByUserId",
                table: "Occurrences");

            migrationBuilder.DropColumn(
                name: "ManagementResponse",
                table: "Occurrences");

            migrationBuilder.DropColumn(
                name: "RespondedAt",
                table: "Occurrences");

            migrationBuilder.DropColumn(
                name: "RespondedByUserId",
                table: "Occurrences");
        }
    }
}
