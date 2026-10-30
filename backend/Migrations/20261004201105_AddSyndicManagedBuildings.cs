using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSyndicManagedBuildings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ManagesAllBuildings",
                table: "UserCondominiums",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "UserCondominiumBuildings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserCondominiumId = table.Column<int>(type: "int", nullable: false),
                    BuildingId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserCondominiumBuildings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserCondominiumBuildings_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserCondominiumBuildings_UserCondominiums_UserCondominiumId",
                        column: x => x.UserCondominiumId,
                        principalTable: "UserCondominiums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_UserCondominiumBuildings_BuildingId",
                table: "UserCondominiumBuildings",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_UserCondominiumBuildings_UserCondominiumId_BuildingId",
                table: "UserCondominiumBuildings",
                columns: new[] { "UserCondominiumId", "BuildingId" },
                unique: true);

            // Keep what existing syndics could already see: the buildings where they own or rent a unit.
            // New syndics start managing all buildings (set when the invitation is accepted).
            migrationBuilder.Sql(@"
                INSERT INTO UserCondominiumBuildings (UserCondominiumId, BuildingId, CreatedAt)
                SELECT DISTINCT uc.Id, un.BuildingId, UTC_TIMESTAMP(6)
                FROM UserCondominiums uc
                JOIN AspNetUsers u ON u.Id = uc.UserId
                JOIN PersonUnits pu ON pu.PersonId = u.PersonId
                JOIN Units un ON un.Id = pu.UnitId
                JOIN Buildings b ON b.Id = un.BuildingId AND b.CondominiumId = uc.CondominiumId
                WHERE uc.Role = 'Syndic';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserCondominiumBuildings");

            migrationBuilder.DropColumn(
                name: "ManagesAllBuildings",
                table: "UserCondominiums");
        }
    }
}
