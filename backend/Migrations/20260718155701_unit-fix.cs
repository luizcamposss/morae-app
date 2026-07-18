using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class UnitFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PersonCondominiums",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PersonId = table.Column<int>(type: "int", nullable: false),
                    CondominiumId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonCondominiums", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PersonCondominiums_Condominiums_CondominiumId",
                        column: x => x.CondominiumId,
                        principalTable: "Condominiums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PersonCondominiums_Persons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PersonCondominiums_CondominiumId",
                table: "PersonCondominiums",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonCondominiums_PersonId_CondominiumId",
                table: "PersonCondominiums",
                columns: new[] { "PersonId", "CondominiumId" },
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO PersonCondominiums (PersonId, CondominiumId, CreatedAt)
                SELECT DISTINCT pu.PersonId, b.CondominiumId, UTC_TIMESTAMP(6)
                FROM PersonUnits pu
                INNER JOIN Units u ON pu.UnitId = u.Id
                INNER JOIN Buildings b ON u.BuildingId = b.Id
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM PersonCondominiums pc
                    WHERE pc.PersonId = pu.PersonId
                    AND pc.CondominiumId = b.CondominiumId
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PersonCondominiums");
        }
    }
}
