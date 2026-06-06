using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class FixPersonUpdatedAtAndAddUserCondominiums : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                table: "Invitations");

            migrationBuilder.RenameColumn(
                name: "UpdateAt",
                table: "Persons",
                newName: "UpdatedAt");

            migrationBuilder.AddColumn<int>(
                name: "PersonId",
                table: "Invitations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Token",
                table: "Invitations",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "UserCondominiums",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CondominiumId = table.Column<int>(type: "int", nullable: false),
                    Role = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserCondominiums", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserCondominiums_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserCondominiums_Condominiums_CondominiumId",
                        column: x => x.CondominiumId,
                        principalTable: "Condominiums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PersonUnits_PersonId_UnitId_RelationshipType",
                table: "PersonUnits",
                columns: new[] { "PersonId", "UnitId", "RelationshipType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Persons_CPF",
                table: "Persons",
                column: "CPF",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_PersonId",
                table: "Invitations",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_UserCondominiums_CondominiumId",
                table: "UserCondominiums",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_UserCondominiums_UserId_CondominiumId_Role",
                table: "UserCondominiums",
                columns: new[] { "UserId", "CondominiumId", "Role" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Invitations_Persons_PersonId",
                table: "Invitations",
                column: "PersonId",
                principalTable: "Persons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Invitations_Persons_PersonId",
                table: "Invitations");

            migrationBuilder.DropTable(
                name: "UserCondominiums");

            migrationBuilder.DropIndex(
                name: "IX_PersonUnits_PersonId_UnitId_RelationshipType",
                table: "PersonUnits");

            migrationBuilder.DropIndex(
                name: "IX_Persons_CPF",
                table: "Persons");

            migrationBuilder.DropIndex(
                name: "IX_Invitations_PersonId",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "PersonId",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "Token",
                table: "Invitations");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "Persons",
                newName: "UpdateAt");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Invitations",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

        }
    }
}
