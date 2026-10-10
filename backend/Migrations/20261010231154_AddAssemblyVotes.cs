using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssemblyVotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssemblyVotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AssemblyId = table.Column<int>(type: "int", nullable: false),
                    AssemblyItemId = table.Column<int>(type: "int", nullable: false),
                    AssemblyItemOptionId = table.Column<int>(type: "int", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: false),
                    VotedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssemblyVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssemblyVotes_AspNetUsers_VotedByUserId",
                        column: x => x.VotedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssemblyVotes_Assemblies_AssemblyId",
                        column: x => x.AssemblyId,
                        principalTable: "Assemblies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AssemblyVotes_AssemblyItemOptions_AssemblyItemOptionId",
                        column: x => x.AssemblyItemOptionId,
                        principalTable: "AssemblyItemOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssemblyVotes_AssemblyItems_AssemblyItemId",
                        column: x => x.AssemblyItemId,
                        principalTable: "AssemblyItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssemblyVotes_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AssemblyVotes_AssemblyId_UnitId",
                table: "AssemblyVotes",
                columns: new[] { "AssemblyId", "UnitId" });

            migrationBuilder.CreateIndex(
                name: "IX_AssemblyVotes_AssemblyItemId_UnitId",
                table: "AssemblyVotes",
                columns: new[] { "AssemblyItemId", "UnitId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssemblyVotes_AssemblyItemOptionId",
                table: "AssemblyVotes",
                column: "AssemblyItemOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_AssemblyVotes_UnitId",
                table: "AssemblyVotes",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_AssemblyVotes_VotedByUserId",
                table: "AssemblyVotes",
                column: "VotedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssemblyVotes");
        }
    }
}
