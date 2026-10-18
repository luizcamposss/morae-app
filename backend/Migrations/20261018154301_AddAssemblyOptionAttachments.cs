using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssemblyOptionAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttachmentContentType",
                table: "AssemblyItemOptions",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "AttachmentFileName",
                table: "AssemblyItemOptions",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<long>(
                name: "AttachmentSizeBytes",
                table: "AssemblyItemOptions",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentStorageKey",
                table: "AssemblyItemOptions",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachmentContentType",
                table: "AssemblyItemOptions");

            migrationBuilder.DropColumn(
                name: "AttachmentFileName",
                table: "AssemblyItemOptions");

            migrationBuilder.DropColumn(
                name: "AttachmentSizeBytes",
                table: "AssemblyItemOptions");

            migrationBuilder.DropColumn(
                name: "AttachmentStorageKey",
                table: "AssemblyItemOptions");
        }
    }
}
