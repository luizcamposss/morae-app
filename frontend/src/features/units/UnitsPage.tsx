import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, DoorClosed, Plus, Search, Users } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button, ButtonLink } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { createUnit, deleteUnit, getUnitsByBuilding, updateUnit } from "./unitService";
import { UNIT_STATUS_FILTERS, emptyUnitForm, toUnitForm, unitTypeLabel } from "./unitForm";
import { UnitDetailsModal, UnitFormModal } from "./UnitModals";
import type { UnitResponse } from "./types";

type StatusFilter = (typeof UNIT_STATUS_FILTERS)[number]["value"];

export function UnitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    condominiums,
    activeCondominium,
    activeCondominiumId,
    isLoading: isLoadingCondominiums,
    errorMessage: condominiumErrorMessage,
    setActiveCondominiumId,
  } = useCondominium();

  const [buildings, setBuildings] = useState<BuildingResponse[]>([]);
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitResponse | null>(null);
  const [viewingUnitId, setViewingUnitId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  // The building comes from the URL (?buildingId=, also used by the Prédios screen); falls back to the first one.
  const requestedBuildingId = Number(searchParams.get("buildingId"));
  const selectedBuilding = buildings.find((building) => building.id === requestedBuildingId) ?? buildings[0] ?? null;
  const selectedBuildingId = selectedBuilding?.id ?? null;

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    getBuildingsByCondominium(activeCondominiumId)
      .then((result) => {
        if (!isMounted) return;
        setBuildings(result);
        setErrorMessage("");
        if (result.length === 0) setIsLoadingUnits(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        setBuildings([]);
        setIsLoadingUnits(false);
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os prédios.");
      })
      .finally(() => isMounted && setIsLoadingBuildings(false));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  useEffect(() => {
    if (!selectedBuildingId) return;
    let isMounted = true;

    getUnitsByBuilding(selectedBuildingId)
      .then((result) => isMounted && setUnits(result))
      .catch((error) => {
        if (!isMounted) return;
        setUnits([]);
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as unidades.");
      })
      .finally(() => isMounted && setIsLoadingUnits(false));

    return () => {
      isMounted = false;
    };
  }, [selectedBuildingId]);

  async function refreshUnits() {
    if (selectedBuildingId) setUnits(await getUnitsByBuilding(selectedBuildingId));
  }

  function selectBuilding(buildingId: number) {
    if (buildingId === selectedBuildingId) return;
    setIsLoadingUnits(true);
    setSuccessMessage("");
    setSearchParams({ buildingId: String(buildingId) }, { replace: true });
  }

  const visibleUnits = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return units.filter(
      (unit) =>
        (statusFilter === "all" || unit.status === statusFilter) &&
        (!term || unit.number.toLowerCase().includes(term) || unit.responsiblePersonName.toLowerCase().includes(term)),
    );
  }, [searchTerm, statusFilter, units]);

  const occupiedUnits = units.filter((unit) => unit.status === "Ocupada").length;
  const vacantUnits = units.filter((unit) => unit.status === "Vaga").length;
  const totalResidents = units.reduce((sum, unit) => sum + unit.residentCount, 0);
  const countFor = (filter: StatusFilter) => (filter === "all" ? units.length : filter === "Ocupada" ? occupiedUnits : vacantUnits);

  const isLoading = isLoadingCondominiums || isLoadingBuildings || (Boolean(selectedBuildingId) && isLoadingUnits);
  const pageErrorMessage = condominiumErrorMessage || errorMessage;
  const viewingUnit = units.find((unit) => unit.id === viewingUnitId) ?? null;

  function askDelete(unit: UnitResponse) {
    setViewingUnitId(null);
    setConfirmRequest({
      title: `Excluir a unidade ${unit.number}?`,
      description: `A unidade sai do prédio ${unit.buildingName}. Só dá para excluir unidades sem pessoas vinculadas. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir unidade",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteUnit(unit.id);
          await refreshUnits();
          setSuccessMessage(`Unidade ${unit.number} excluída.`);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível excluir a unidade.");
        }
      },
    });
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Unidades">
        <Button
          variant="accent"
          disabled={!selectedBuilding}
          onClick={() => {
            setSuccessMessage("");
            setIsCreateOpen(true);
          }}
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
          Nova unidade
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

      {!isLoadingBuildings && buildings.length === 0 ? (
        <section className="flex flex-col items-center rounded-card bg-superficie px-6 py-14 text-center shadow-whisper">
          <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
            <Building2 size={22} strokeWidth={1.8} aria-hidden />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-tinta">Cadastre um prédio primeiro</h2>
          <p className="mt-1 max-w-sm text-sm text-tinta-suave">As unidades ficam dentro de um prédio, bloco ou torre.</p>
          <ButtonLink to="/admin/buildings" variant="quiet" size="sm" className="mt-5">
            Ir para Prédios
          </ButtonLink>
        </section>
      ) : (
        <>
          {buildings.length > 1 && (
            <div role="tablist" aria-label="Prédio" className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {buildings.map((building) => {
                const isSelected = building.id === selectedBuildingId;
                return (
                  <button
                    key={building.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => selectBuilding(building.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isSelected ? "bg-tinta text-white" : "bg-superficie text-tinta shadow-whisper hover:bg-campo"
                    }`}
                  >
                    {building.name}
                    <span className={`text-xs font-medium tabular-nums ${isSelected ? "text-white/70" : "text-tinta-suave"}`}>{building.unitCount}</span>
                  </button>
                );
              })}
            </div>
          )}

          <SummaryCard
            label={selectedBuilding ? `Resumo do ${selectedBuilding.name}` : "Resumo"}
            items={[
              { label: "Unidades", value: isLoading ? "–" : String(units.length), detail: selectedBuilding?.name ?? "" },
              { label: "Ocupadas", value: isLoading ? "–" : String(occupiedUnits), detail: "com alguém vinculado", tone: occupiedUnits > 0 ? "good" : "neutral" },
              { label: "Vagas", value: isLoading ? "–" : String(vacantUnits), detail: "sem vínculo" },
              { label: "Moradores", value: isLoading ? "–" : String(totalResidents), detail: "vínculos ativos" },
            ]}
          />

          <div className="mb-4 mt-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div role="tablist" aria-label="Situação" className="flex gap-1 self-start rounded-field bg-campo p-1">
              {UNIT_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`flex items-center gap-1.5 rounded-field px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    statusFilter === filter.value ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                  }`}
                >
                  {filter.label}
                  <span className="text-xs font-medium tabular-nums text-tinta-suave">{countFor(filter.value)}</span>
                </button>
              ))}
            </div>
            <label className="relative sm:w-72">
              <span className="sr-only">Buscar unidade</span>
              <Search size={17} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-tinta-suave" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Número ou responsável"
                className="w-full rounded-full bg-superficie py-2.5 pl-10 pr-4 text-sm text-tinta shadow-whisper outline-none placeholder:text-tinta-suave/80 focus:ring-2 focus:ring-verde focus-visible:outline-none"
              />
            </label>
          </div>

          {isLoading ? (
            <p className="rounded-card bg-superficie px-5 py-12 text-center text-sm text-tinta-suave shadow-whisper">Carregando…</p>
          ) : visibleUnits.length === 0 ? (
            <div className="flex flex-col items-center rounded-card bg-superficie px-5 py-12 text-center shadow-whisper">
              {units.length === 0 ? (
                <>
                  <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                    <DoorClosed size={22} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhuma unidade neste prédio</span>
                  <span className="mt-1 max-w-sm text-sm text-tinta-suave">Cadastre os apartamentos, casas ou lojas para vincular os moradores.</span>
                  <Button variant="quiet" size="sm" className="mt-5" onClick={() => setIsCreateOpen(true)}>
                    Cadastrar a primeira unidade
                  </Button>
                </>
              ) : (
                <span className="text-sm text-tinta-suave">Nenhuma unidade encontrada com esses filtros.</span>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleUnits.map((unit) => {
                const isOccupied = unit.status === "Ocupada";
                return (
                  <li key={unit.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMessage("");
                        setViewingUnitId(unit.id);
                      }}
                      className="flex h-full w-full flex-col rounded-card bg-superficie p-4 text-left shadow-whisper transition-[box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-float"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-display text-[26px] font-bold leading-none tracking-[-0.015em] tabular-nums text-tinta">{unit.number}</span>
                        <span
                          className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${isOccupied ? "bg-verde-suave text-verde-tinta" : "bg-campo text-tinta-suave"}`}
                        >
                          {isOccupied ? "Ocupada" : "Vaga"}
                        </span>
                      </span>
                      <span className="mt-1 text-[13px] text-tinta-suave">{unitTypeLabel(unit.unitType)}</span>
                      <span className="mt-4 flex items-center gap-1.5 text-[13px] text-tinta">
                        <Users size={14} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                        <span className="truncate">
                          {unit.responsiblePersonName || (unit.residentCount ? `${unit.residentCount} vinculado${unit.residentCount === 1 ? "" : "s"}` : "Ninguém vinculado")}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {isCreateOpen && selectedBuilding && (
        <UnitFormModal
          title="Nova unidade"
          description={`Prédio ${selectedBuilding.name}`}
          submitLabel="Cadastrar unidade"
          initialForm={emptyUnitForm}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (form) => {
            await createUnit(selectedBuilding.id, form);
            await refreshUnits();
            setSuccessMessage(`Unidade ${form.number} cadastrada.`);
          }}
        />
      )}

      {editingUnit && (
        <UnitFormModal
          title={`Editar unidade ${editingUnit.number}`}
          description={editingUnit.buildingName}
          submitLabel="Salvar alterações"
          initialForm={toUnitForm(editingUnit)}
          onClose={() => setEditingUnit(null)}
          onSubmit={async (form) => {
            await updateUnit(editingUnit.id, form);
            await refreshUnits();
            setSuccessMessage("Unidade atualizada.");
          }}
        />
      )}

      {viewingUnit && activeCondominiumId && (
        <UnitDetailsModal
          unit={viewingUnit}
          condominiumId={activeCondominiumId}
          onClose={() => setViewingUnitId(null)}
          onEdit={() => {
            setEditingUnit(viewingUnit);
            setViewingUnitId(null);
          }}
          onDelete={() => askDelete(viewingUnit)}
          onChanged={async (message) => {
            await refreshUnits();
            setSuccessMessage(message);
          }}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}
