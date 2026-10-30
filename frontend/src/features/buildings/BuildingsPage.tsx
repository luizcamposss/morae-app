import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { createBuilding, getBuildingsByCondominium, updateBuilding } from "./buildingService";
import { emptyBuildingForm, occupancyOf, toBuildingForm } from "./buildingForm";
import { BuildingDetailsModal, BuildingFormModal, OccupancyBar } from "./BuildingModals";
import type { BuildingResponse } from "./types";

export function BuildingsPage() {
  const {
    condominiums,
    activeCondominium,
    activeCondominiumId,
    isLoading: isLoadingCondominiums,
    errorMessage: condominiumErrorMessage,
    setActiveCondominiumId,
  } = useCondominium();

  const [buildings, setBuildings] = useState<BuildingResponse[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingResponse | null>(null);
  const [viewingBuilding, setViewingBuilding] = useState<BuildingResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getBuildingsByCondominium(activeCondominiumId)
      .then((result) => {
        if (!isMounted) return;
        setBuildings(result);
        setErrorMessage("");
      })
      .catch((error) => {
        if (!isMounted) return;
        setBuildings([]);
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os prédios.");
      })
      .finally(() => isMounted && setIsLoadingBuildings(false));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  async function refreshBuildings() {
    if (activeCondominiumId) setBuildings(await getBuildingsByCondominium(activeCondominiumId));
  }

  const filteredBuildings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return buildings;

    return buildings.filter(
      (building) =>
        building.name.toLowerCase().includes(term) ||
        building.code.toLowerCase().includes(term) ||
        building.buildingType.toLowerCase().includes(term) ||
        building.notes.toLowerCase().includes(term),
    );
  }, [buildings, searchTerm]);

  const totalUnits = buildings.reduce((sum, building) => sum + building.unitCount, 0);
  const occupiedUnits = buildings.reduce((sum, building) => sum + building.occupiedUnitCount, 0);
  const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const totalResidents = buildings.reduce((sum, building) => sum + building.residentCount, 0);

  const isLoading = isLoadingCondominiums || (Boolean(activeCondominiumId) && isLoadingBuildings);
  const pageErrorMessage = condominiumErrorMessage || errorMessage;

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Prédios">
        <Button
          variant="accent"
          disabled={!activeCondominiumId}
          onClick={() => {
            setSuccessMessage("");
            setIsCreateOpen(true);
          }}
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
          Novo prédio
        </Button>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ?? ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
        />
      )}

      {pageErrorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {pageErrorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      <SummaryCard
        items={[
          { label: "Unidades", value: isLoading ? "–" : String(totalUnits), detail: `em ${buildings.length} prédio${buildings.length === 1 ? "" : "s"}` },
          {
            label: "Ocupação",
            value: isLoading ? "–" : `${occupancyRate}%`,
            detail: `${occupiedUnits} de ${totalUnits} ocupada${occupiedUnits === 1 ? "" : "s"}`,
            tone: totalUnits > 0 && occupancyRate >= 80 ? "good" : "neutral",
          },
          { label: "Unidades vagas", value: isLoading ? "–" : String(vacantUnits), detail: "prontas para vincular" },
          { label: "Moradores", value: isLoading ? "–" : String(totalResidents), detail: "vinculados às unidades" },
        ]}
      />

      <div className="mb-4 mt-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 className="font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">Todos os prédios</h2>
        <label className="relative sm:w-72">
          <span className="sr-only">Buscar prédio</span>
          <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Nome, código ou tipo"
            className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
          />
        </label>
      </div>

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {filteredBuildings.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="text-sm text-tinta-suave">Carregando…</span>
            ) : searchTerm ? (
              <span className="text-sm text-tinta-suave">Nenhum prédio encontrado com essa busca.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <Building2 size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhum prédio cadastrado</span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">
                  Cadastre os blocos ou torres do condomínio. Depois é só criar as unidades de cada um.
                </span>
                {activeCondominiumId && (
                  <Button variant="quiet" size="sm" className="mt-5" onClick={() => setIsCreateOpen(true)}>
                    Cadastrar o primeiro prédio
                  </Button>
                )}
              </>
            )}
          </li>
        ) : (
          filteredBuildings.map((building) => {
            const occupancy = occupancyOf(building);
            const needsAttention = building.status === "Atencao";
            return (
              <li key={building.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setViewingBuilding(building);
                  }}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                    <Building2 size={18} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-tinta">{building.name}</span>
                      {needsAttention && (
                        <span className="shrink-0 rounded-chip bg-ambar-suave px-2 py-0.5 text-xs font-semibold text-ambar">Atenção</span>
                      )}
                    </span>
                    <span className="block truncate text-[13px] text-tinta-suave">
                      {building.code} · {building.buildingType} · {building.floorCount} andar{building.floorCount === 1 ? "" : "es"}
                      {building.hasElevator ? " · elevador" : ""}
                    </span>
                  </span>
                  <span className="hidden w-40 shrink-0 sm:block">
                    <span className="flex items-baseline justify-between text-xs text-tinta-suave">
                      <span>
                        {building.occupiedUnitCount}/{building.unitCount} ocupadas
                      </span>
                      <span className="font-semibold tabular-nums text-tinta">{occupancy}%</span>
                    </span>
                    <OccupancyBar value={occupancy} className="mt-1.5" />
                  </span>
                  <span className="text-right sm:hidden">
                    <span className="block text-sm font-semibold tabular-nums text-tinta">{building.unitCount}</span>
                    <span className="block text-xs text-tinta-suave">unidades</span>
                  </span>
                  <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                </button>
              </li>
            );
          })
        )}
      </ul>

      {isCreateOpen && activeCondominiumId && (
        <BuildingFormModal
          title="Novo prédio"
          submitLabel="Cadastrar prédio"
          initialForm={emptyBuildingForm}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (form) => {
            await createBuilding(activeCondominiumId, form);
            await refreshBuildings();
            setSuccessMessage("Prédio cadastrado.");
          }}
        />
      )}

      {editingBuilding && (
        <BuildingFormModal
          title="Editar prédio"
          submitLabel="Salvar alterações"
          initialForm={toBuildingForm(editingBuilding)}
          onClose={() => setEditingBuilding(null)}
          onSubmit={async (form) => {
            await updateBuilding(editingBuilding.id, form);
            await refreshBuildings();
            setSuccessMessage("Prédio atualizado.");
          }}
        />
      )}

      {viewingBuilding && (
        <BuildingDetailsModal
          building={viewingBuilding}
          onClose={() => setViewingBuilding(null)}
          onEdit={() => {
            setEditingBuilding(viewingBuilding);
            setViewingBuilding(null);
          }}
        />
      )}
    </>
  );
}
