import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useCondominium } from "../../app/providers/useCondominium";
import { createPersonInCondominium, getPersonsByCondominium } from "../persons/personService";
import type { CreatePersonRequest, PersonResponse } from "../persons/types";
import {
  getPeopleByUnit,
  linkPersonToUnit,
  removePersonUnit,
} from "../personUnits/personUnitService";
import type {
  CreatePersonUnitRequest,
  PersonUnitResponse,
} from "../personUnits/types";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { createUnit, deleteUnit, getUnitsByBuilding, updateUnit } from "./unitService";
import type { CreateUnitRequest, UnitResponse } from "./types";

const unitTypeOptions = [
  { value: 1, label: "Apartamento" },
  { value: 2, label: "Casa" },
  { value: 3, label: "Sala comercial" },
  { value: 4, label: "Loja" },
  { value: 5, label: "Garagem" },
  { value: 6, label: "Cobertura" },
];

const relationshipOptions = [
  { value: 1, label: "Proprietário" },
  { value: 2, label: "Morador" },
  { value: 3, label: "Inquilino" },
];

const UNIT_STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "Ocupada", label: "Ocupadas" },
  { value: "Vaga", label: "Vagas" },
];

const UNIT_FIELD_LIMITS = {
  number: 20,
  rooms: 20,
  bathrooms: 20,
  squareMeters: 10000,
  observations: 500,
};

function validateUnitForm(form: CreateUnitRequest) {
  const number = form.number.trim();
  const observations = form.observations.trim();

  if (!number) {
    return "Informe o número da unidade.";
  }

  if (number.length > UNIT_FIELD_LIMITS.number) {
    return "O número da unidade deve ter no máximo 20 caracteres.";
  }

  if (form.unitType < 1 || form.unitType > 6) {
    return "Selecione um tipo de unidade válido.";
  }

  if (Number.isNaN(form.rooms) || form.rooms < 0 || form.rooms > UNIT_FIELD_LIMITS.rooms) {
    return "Informe uma quantidade de quartos entre 0 e 20.";
  }

  if (
    Number.isNaN(form.bathrooms) ||
    form.bathrooms < 0 ||
    form.bathrooms > UNIT_FIELD_LIMITS.bathrooms
  ) {
    return "Informe uma quantidade de banheiros entre 0 e 20.";
  }

  if (
    Number.isNaN(form.squareMeters) ||
    form.squareMeters < 0 ||
    form.squareMeters > UNIT_FIELD_LIMITS.squareMeters
  ) {
    return "Informe uma metragem entre 0 e 10.000 m².";
  }

  if (observations.length > UNIT_FIELD_LIMITS.observations) {
    return "As observações devem ter no máximo 500 caracteres.";
  }

  return "";
}

function sanitizeUnitForm(form: CreateUnitRequest): CreateUnitRequest {
  return {
    number: form.number.trim(),
    unitType: form.unitType,
    rooms: Number(form.rooms),
    bathrooms: Number(form.bathrooms),
    squareMeters: Number(form.squareMeters),
    observations: form.observations.trim(),
  };
}

function getUnitTypeLabel(unitType: number) {
  return unitTypeOptions.find((option) => option.value === unitType)?.label ?? "Não informado";
}

function getRelationshipLabel(relationshipType: number) {
  return relationshipOptions.find((option) => option.value === relationshipType)?.label ?? "Não informado";
}

function getUnitStatusVariant(status: string) {
  if (status === "Ocupada") {
    return "success" as const;
  }

  if (status === "Vaga") {
    return "neutral" as const;
  }

  return "warning" as const;
}

export function UnitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    condominiums,
    activeCondominiumId,
    isLoading: isLoadingCondominiums,
    errorMessage: condominiumErrorMessage,
    setActiveCondominiumId,
  } = useCondominium();

  const [availableBuildings, setAvailableBuildings] = useState<BuildingResponse[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitResponse | null>(null);
  const [viewingUnit, setViewingUnit] = useState<UnitResponse | null>(null);
  const [linkingUnit, setLinkingUnit] = useState<UnitResponse | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<UnitResponse | null>(null);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isBuildingSelectOpen, setIsBuildingSelectOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  const selectedBuilding = availableBuildings.find((building) => building.id === selectedBuildingId) ?? null;
  const selectedStatusFilter = UNIT_STATUS_FILTERS.find((filter) => filter.value === statusFilter);

  const filteredUnits = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesStatus = statusFilter === "all" || unit.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        unit.number.toLowerCase().includes(normalizedSearch) ||
        unit.buildingName.toLowerCase().includes(normalizedSearch) ||
        unit.responsiblePersonName.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [searchTerm, statusFilter, units]);

  const totalUnits = units.length;
  const occupiedUnits = units.filter((unit) => unit.status === "Ocupada").length;
  const vacantUnits = units.filter((unit) => unit.status === "Vaga").length;
  const totalResidents = units.reduce((sum, unit) => sum + unit.residentCount, 0);

  const metrics = [
    {
      label: "Unidades",
      value: totalUnits.toString(),
      helper: "Cadastradas no prédio",
    },
    {
      label: "Com vínculo",
      value: occupiedUnits.toString(),
      helper: "Possuem responsável",
    },
    {
      label: "Sem vínculo",
      value: vacantUnits.toString(),
      helper: "Disponíveis para cadastro",
    },
    {
      label: "Moradores",
      value: totalResidents.toString(),
      helper: "Vínculos ativos",
    },
  ];

  async function loadBuildings(condominiumId: number) {
    try {
      setErrorMessage("");
      setIsLoadingBuildings(true);

      const result = await getBuildingsByCondominium(condominiumId);
      setAvailableBuildings(result);

      if (result.length === 0) {
        setSelectedBuildingId(null);
        setUnits([]);
        setIsLoadingUnits(false);
        setSearchParams({}, { replace: true });
        return;
      }

      const requestedBuildingId = Number(searchParams.get("buildingId"));
      const hasRequestedBuilding = result.some((building) => building.id === requestedBuildingId);
      const nextBuildingId = hasRequestedBuilding ? requestedBuildingId : result[0].id;

      setSelectedBuildingId(nextBuildingId);
      setSearchParams({ buildingId: nextBuildingId.toString() }, { replace: true });
    } catch (error) {
      setAvailableBuildings([]);
      setSelectedBuildingId(null);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível carregar os prédios.");
      }
    } finally {
      setIsLoadingBuildings(false);
    }
  }

  async function loadUnits(buildingId: number) {
    try {
      setErrorMessage("");
      setIsLoadingUnits(true);

      const result = await getUnitsByBuilding(buildingId);
      setUnits(result);
    } catch (error) {
      setUnits([]);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível carregar as unidades.");
      }
    } finally {
      setIsLoadingUnits(false);
    }
  }

  async function refreshCurrentUnits() {
    if (!selectedBuildingId) {
      return;
    }

    await loadUnits(selectedBuildingId);
  }

  useEffect(() => {
    if (!activeCondominiumId) {
      setAvailableBuildings([]);
      setSelectedBuildingId(null);
      setUnits([]);
      setIsLoadingBuildings(false);
      setIsLoadingUnits(false);
      return;
    }

    void loadBuildings(activeCondominiumId);
  }, [activeCondominiumId]);

  useEffect(() => {
    if (!selectedBuildingId) {
      setUnits([]);
      setIsLoadingUnits(false);
      return;
    }

    void loadUnits(selectedBuildingId);
  }, [selectedBuildingId]);

  const isLoading = isLoadingCondominiums || isLoadingBuildings || isLoadingUnits;
  const pageErrorMessage = condominiumErrorMessage || errorMessage;

  function handleBuildingChange(buildingId: number) {
    setSelectedBuildingId(buildingId);
    setSearchParams({ buildingId: buildingId.toString() }, { replace: true });
  }

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
              Unidades
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Organize apartamentos, responsáveis e vínculos de cada unidade.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            {condominiums.length > 1 && (
              <select
                value={activeCondominiumId ?? ""}
                onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
                className="h-11 min-w-72 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
              >
                {condominiums.map((condominium) => (
                  <option
                    key={condominium.condominiumId}
                    value={condominium.condominiumId}
                  >
                    {condominium.condominiumName}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={!selectedBuildingId}
              onClick={() => setIsCreateOpen(true)}
              className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
            >
              + Nova Unidade
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
            />
          ))}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_max-content_minmax(140px,170px)]">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar unidade, prédio ou responsável..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 pr-11 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-base font-extrabold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                >
                  ×
                </button>
              )}
            </div>

            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsBuildingSelectOpen(false);
                }
              }}
            >
              <button
                type="button"
                disabled={availableBuildings.length === 0}
                onClick={() => setIsBuildingSelectOpen((current) => !current)}
                className={`flex h-11 min-w-40 max-w-72 items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-sm font-bold text-[#111827] outline-none transition disabled:cursor-not-allowed disabled:opacity-70 ${isBuildingSelectOpen
                    ? "border-[#22C55E] ring-4 ring-[#86EFAC]/30"
                    : "border-[#E5E7EB] hover:border-[#86EFAC]"
                  } ${availableBuildings.length === 0 ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="truncate">{selectedBuilding?.name ?? "Nenhum prédio disponível"}</span>
                <span className={`text-[#6B7280] transition ${isBuildingSelectOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {isBuildingSelectOpen && availableBuildings.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-[#D9DEE5] bg-white p-1 shadow-xl shadow-[#111827]/10">
                  {availableBuildings.map((building) => {
                    const isSelected = building.id === selectedBuildingId;

                    return (
                      <button
                        key={building.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          handleBuildingChange(building.id);
                          setIsBuildingSelectOpen(false);
                        }}
                        className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-bold transition ${isSelected
                            ? "bg-[#DCFCE7] text-[#0B3D2E]"
                            : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                          }`}
                      >
                        {building.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsStatusFilterOpen(false);
                }
              }}
            >
              <button
                type="button"
                onClick={() => setIsStatusFilterOpen((current) => !current)}
                className={`flex h-11 min-w-36 cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold text-[#111827] outline-none transition ${
                  isStatusFilterOpen
                    ? "border-[#22C55E] ring-4 ring-[#86EFAC]/30"
                    : "border-[#E5E7EB] hover:border-[#86EFAC]"
                }`}
              >
                <span>{selectedStatusFilter?.label ?? "Filtrar"}</span>
                <span className={`text-[#6B7280] transition ${isStatusFilterOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {isStatusFilterOpen && (
                <div className="absolute right-0 z-30 mt-2 w-40 overflow-hidden rounded-2xl border border-[#D9DEE5] bg-white p-1 shadow-xl shadow-[#111827]/10">
                  {UNIT_STATUS_FILTERS.map((filter) => {
                    const isSelected = filter.value === statusFilter;

                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setStatusFilter(filter.value);
                          setIsStatusFilterOpen(false);
                        }}
                        className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-bold transition ${
                          isSelected
                            ? "bg-[#DCFCE7] text-[#0B3D2E]"
                            : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedBuilding && (
            <p className="mb-4 text-sm font-semibold text-[#6B7280]">
              Prédio selecionado: <span className="text-[#111827]">{selectedBuilding.name}</span>
            </p>
          )}

          {isLoading && (
            <p className="mb-4 text-sm font-semibold text-[#6B7280]">
              Carregando unidades...
            </p>
          )}

          {pageErrorMessage && (
            <p className="mb-4 text-sm font-semibold text-[#B42318]">
              {pageErrorMessage}
            </p>
          )}

          {successMessage && (
            <p className="mb-4 text-sm font-semibold text-[#16A34A]">
              {successMessage}
            </p>
          )}

          {!isLoading && filteredUnits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-[#111827]">
                {searchTerm ? "Nenhuma unidade encontrada" : "Nenhuma unidade cadastrada"}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                {searchTerm
                  ? "Tente outro termo para localizar a unidade."
                  : "Cadastre a primeira unidade deste prédio para continuar."}
              </p>
              {!searchTerm && selectedBuildingId && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-6 h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                >
                  + Nova Unidade
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Prédio</th>
                    <th className="px-4 py-3 font-extrabold">Unidade</th>
                    <th className="px-4 py-3 font-extrabold">Tipo</th>
                    <th className="px-4 py-3 font-extrabold">Responsável</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id} className="transition hover:bg-[#F3F4F6]">
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {unit.buildingName}
                      </td>
                      <td className="px-4 py-4 font-extrabold text-[#111827]">
                        {unit.number}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {getUnitTypeLabel(unit.unitType)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {unit.responsiblePersonName || "Sem responsável"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          label={unit.status}
                          variant={getUnitStatusVariant(unit.status)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingUnit(unit)}
                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUnit(unit)}
                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinkingUnit(unit)}
                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Vincular pessoa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUnit(unit)}
                            className="cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {isCreateOpen && selectedBuildingId && selectedBuilding && (
        <CreateUnitModal
          buildingId={selectedBuildingId}
          buildingName={selectedBuilding.name}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            await refreshCurrentUnits();
            setSuccessMessage("Unidade cadastrada com sucesso.");
          }}
        />
      )}

      {editingUnit && (
        <EditUnitModal
          unit={editingUnit}
          onClose={() => setEditingUnit(null)}
          onUpdated={async () => {
            await refreshCurrentUnits();
            setSuccessMessage("Unidade atualizada com sucesso.");
          }}
        />
      )}

      {viewingUnit && (
        <ViewUnitModal
          unit={viewingUnit}
          onClose={() => setViewingUnit(null)}
          onChanged={async (message) => {
            await refreshCurrentUnits();
            setSuccessMessage(message);
          }}
        />
      )}

      {linkingUnit && activeCondominiumId && (
        <ManageUnitPeopleModal
          unit={linkingUnit}
          condominiumId={activeCondominiumId}
          onClose={() => setLinkingUnit(null)}
          onChanged={async (message) => {
            await refreshCurrentUnits();
            setSuccessMessage(message);
          }}
        />
      )}

      {deletingUnit && (
        <DeleteUnitModal
          unit={deletingUnit}
          onClose={() => setDeletingUnit(null)}
          onDeleted={async () => {
            await refreshCurrentUnits();
            setSuccessMessage("Unidade excluida com sucesso.");
          }}
        />
      )}
    </>
  );
}

type ModalProps = {
  onClose: () => void;
};

type CreateUnitModalProps = {
  buildingId: number;
  buildingName: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

type EditUnitModalProps = {
  unit: UnitResponse;
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

type ViewUnitModalProps = {
  unit: UnitResponse;
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
};

type ManageUnitPeopleModalProps = {
  unit: UnitResponse;
  condominiumId: number;
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
};

type DeleteUnitModalProps = {
  unit: UnitResponse;
  onClose: () => void;
  onDeleted: () => Promise<void>;
};

function ModalShell({ title, children, onClose }: ModalProps & { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
      <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
          <h2 className="text-2xl font-extrabold text-[#111827]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            x
          </button>
        </div>

        <div className="morae-scrollbar overflow-y-auto px-8 py-7">
          {children}
        </div>
      </div>
    </div>
  );
}

function CreateUnitModal({
  buildingId,
  buildingName,
  onClose,
  onCreated,
}: CreateUnitModalProps) {
  const [form, setForm] = useState<CreateUnitRequest>({
    number: "",
    unitType: 1,
    rooms: 1,
    bathrooms: 1,
    squareMeters: 0,
    observations: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const payload = sanitizeUnitForm(form);
    const validationMessage = validateUnitForm(payload);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);
      await createUnit(buildingId, payload);
      await onCreated();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível cadastrar a unidade.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Cadastrar nova unidade" onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <ReadOnlyField label="Prédio" value={buildingName} />
        <UnitFormFields form={form} onChange={setForm} />

        {errorMessage && (
          <p className="text-sm font-semibold text-[#B42318]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>
    </ModalShell>
  );
}

function EditUnitModal({
  unit,
  onClose,
  onUpdated,
}: EditUnitModalProps) {
  const [form, setForm] = useState<CreateUnitRequest>({
    number: unit.number,
    unitType: unit.unitType,
    rooms: unit.rooms,
    bathrooms: unit.bathrooms,
    squareMeters: unit.squareMeters,
    observations: unit.observations,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const payload = sanitizeUnitForm(form);
    const validationMessage = validateUnitForm(payload);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);
      await updateUnit(unit.id, payload);
      await onUpdated();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível atualizar a unidade.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Editar Unidade" onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <ReadOnlyField label="Prédio" value={unit.buildingName} />
        <UnitFormFields form={form} onChange={setForm} />

        {errorMessage && (
          <p className="text-sm font-semibold text-[#B42318]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </ModalShell>
  );
}

function ViewUnitModal({ unit, onClose, onChanged }: ViewUnitModalProps) {
  const [linkedPeople, setLinkedPeople] = useState<PersonUnitResponse[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [removingPersonUnitId, setRemovingPersonUnitId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const currentResidentCount = isLoadingPeople ? unit.residentCount : linkedPeople.length;
  const currentStatus = isLoadingPeople ? unit.status : linkedPeople.length > 0 ? "Ocupada" : "Vaga";
  const responsiblePersonName = isLoadingPeople
    ? unit.responsiblePersonName
    : linkedPeople.find((linkedPerson) => linkedPerson.relationshipType === 1)?.personName ??
      linkedPeople[0]?.personName ??
      "";

  async function loadLinkedPeople() {
    try {
      setErrorMessage("");
      setIsLoadingPeople(true);
      const result = await getPeopleByUnit(unit.id);
      setLinkedPeople(result);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível carregar os vínculos da unidade.");
      }
    } finally {
      setIsLoadingPeople(false);
    }
  }

  useEffect(() => {
    void loadLinkedPeople();
  }, [unit.id]);

  async function handleRemoveLink(personUnitId: number) {
    try {
      setErrorMessage("");
      setRemovingPersonUnitId(personUnitId);
      await removePersonUnit(personUnitId);
      await loadLinkedPeople();
      await onChanged("Pessoa desvinculada da unidade com sucesso.");
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível desvincular a pessoa.");
      }
    } finally {
      setRemovingPersonUnitId(null);
    }
  }

  return (
    <ModalShell title="Detalhes da Unidade" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReadOnlyField label="Prédio" value={unit.buildingName} />
          <ReadOnlyField label="Unidade" value={unit.number} />
          <ReadOnlyField label="Tipo" value={getUnitTypeLabel(unit.unitType)} />
          <ReadOnlyField label="Status" value={currentStatus} />
          <ReadOnlyField label="Quartos" value={unit.rooms.toString()} />
          <ReadOnlyField label="Banheiros" value={unit.bathrooms.toString()} />
          <ReadOnlyField label="Metros quadrados" value={unit.squareMeters.toString()} />
          <ReadOnlyField
            label="Moradores vinculados"
            value={currentResidentCount.toString()}
          />
          <ReadOnlyField
            label="Responsável"
            value={responsiblePersonName || "Sem responsável"}
          />
        </div>

        <ReadOnlyTextArea
          label="Observações"
          value={unit.observations || "Sem observações"}
        />

        <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#0B3D2E]">
            Pessoas vinculadas
          </h3>

          {isLoadingPeople && (
            <p className="mt-3 text-sm font-semibold text-[#6B7280]">
              Carregando vínculos...
            </p>
          )}

          {errorMessage && (
            <p className="mt-3 text-sm font-semibold text-[#B42318]">
              {errorMessage}
            </p>
          )}

          {!isLoadingPeople && !errorMessage && linkedPeople.length === 0 && (
            <p className="mt-3 text-sm font-semibold text-[#6B7280]">
              Nenhuma pessoa vinculada a esta unidade.
            </p>
          )}

          {!isLoadingPeople && linkedPeople.length > 0 && (
            <div className="mt-4 space-y-3">
              {linkedPeople.map((linkedPerson) => (
                <div
                  key={linkedPerson.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-extrabold text-[#111827]">
                      {linkedPerson.personName}
                    </p>
                    <p className="text-xs font-semibold text-[#6B7280]">
                      {getRelationshipLabel(linkedPerson.relationshipType)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge
                      label={getRelationshipLabel(linkedPerson.relationshipType)}
                      variant="neutral"
                    />

                    <button
                      type="button"
                      disabled={removingPersonUnitId === linkedPerson.id}
                      onClick={() => void handleRemoveLink(linkedPerson.id)}
                      className="cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingPersonUnitId === linkedPerson.id ? "Removendo..." : "Desvincular"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ModalShell>
  );
}

function ManageUnitPeopleModal({
  unit,
  condominiumId,
  onClose,
  onChanged,
}: ManageUnitPeopleModalProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [linkedPeople, setLinkedPeople] = useState<PersonUnitResponse[]>([]);
  const [availablePersons, setAvailablePersons] = useState<PersonResponse[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [relationshipType, setRelationshipType] = useState<number>(2);
  const [newPerson, setNewPerson] = useState<CreatePersonRequest>({
    name: "",
    cpf: "",
    phoneNumber: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    try {
      setErrorMessage("");
      setIsLoading(true);

      const [peopleResult, personsResult] = await Promise.all([
        getPeopleByUnit(unit.id),
        getPersonsByCondominium(condominiumId),
      ]);

      setLinkedPeople(peopleResult);
      setAvailablePersons(personsResult);

      if (personsResult.length > 0) {
        setSelectedPersonId((currentSelectedPersonId) => currentSelectedPersonId ?? personsResult[0].id);
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível carregar os dados da unidade.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [unit.id, condominiumId]);

  async function handleLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      let personId = selectedPersonId;

      if (mode === "new") {
        const createdPerson = await createPersonInCondominium(condominiumId, newPerson);
        personId = createdPerson.id;
      }

      if (!personId) {
        throw new Error("Selecione ou crie uma pessoa para continuar.");
      }

      const payload: CreatePersonUnitRequest = {
        personId,
        relationshipType,
      };

      await linkPersonToUnit(unit.id, payload);
      await loadData();
      await onChanged("Pessoa vinculada com sucesso.");

      if (mode === "new") {
        setMode("existing");
        setNewPerson({
          name: "",
          cpf: "",
          phoneNumber: "",
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível vincular a pessoa.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveLink(personUnitId: number) {
    try {
      setErrorMessage("");
      await removePersonUnit(personUnitId);
      await loadData();
      await onChanged("Vinculo removido com sucesso.");
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível remover o vínculo.");
      }
    }
  }

  return (
    <ModalShell title="Vincular Pessoas a Unidade" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReadOnlyField label="Prédio" value={unit.buildingName} />
          <ReadOnlyField label="Unidade" value={unit.number} />
        </div>

        <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#0B3D2E]">
            Vínculos atuais
          </h3>

          {isLoading && (
            <p className="mt-3 text-sm font-semibold text-[#6B7280]">
              Carregando vínculos...
            </p>
          )}

          {!isLoading && linkedPeople.length === 0 && (
            <p className="mt-3 text-sm font-semibold text-[#6B7280]">
              Nenhuma pessoa vinculada a esta unidade.
            </p>
          )}

          {!isLoading && linkedPeople.length > 0 && (
            <div className="mt-4 space-y-3">
              {linkedPeople.map((linkedPerson) => (
                <div
                  key={linkedPerson.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-extrabold text-[#111827]">
                      {linkedPerson.personName}
                    </p>
                    <p className="text-xs font-semibold text-[#6B7280]">
                      {getRelationshipLabel(linkedPerson.relationshipType)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRemoveLink(linkedPerson.id)}
                    className="cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]"
                  >
                    Remover vínculo
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <form className="space-y-6" onSubmit={handleLink}>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`cursor-pointer rounded-2xl px-4 py-2 text-sm font-extrabold transition ${mode === "existing"
                  ? "bg-[#16A34A] text-white"
                  : "border border-[#E5E7EB] bg-white text-[#6B7280]"
                }`}
            >
              Pessoa existente
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`cursor-pointer rounded-2xl px-4 py-2 text-sm font-extrabold transition ${mode === "new"
                  ? "bg-[#16A34A] text-white"
                  : "border border-[#E5E7EB] bg-white text-[#6B7280]"
                }`}
            >
              Nova pessoa
            </button>
          </div>

          {mode === "existing" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SelectField
                label="Pessoa"
                value={selectedPersonId ?? 0}
                onChange={(value) => setSelectedPersonId(value)}
                options={
                  availablePersons.length > 0
                    ? availablePersons.map((person) => ({
                      value: person.id,
                      label: `${person.name} - CPF ${person.cpf}`,
                    }))
                    : [{ value: 0, label: "Nenhuma pessoa disponivel" }]
                }
                disabled={availablePersons.length === 0}
              />

              <SelectField
                label="Tipo de vínculo"
                value={relationshipType}
                onChange={setRelationshipType}
                options={relationshipOptions}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field
                  label="Nome"
                  value={newPerson.name}
                  onChange={(value) => setNewPerson((current) => ({ ...current, name: value }))}
                  placeholder="Nome completo"
                />
                <Field
                  label="CPF"
                  value={newPerson.cpf}
                  onChange={(value) =>
                    setNewPerson((current) => ({
                      ...current,
                      cpf: value.replace(/\D/g, "").slice(0, 11),
                    }))
                  }
                  placeholder="Somente numeros"
                />
                <Field
                  label="Telefone"
                  value={newPerson.phoneNumber}
                  onChange={(value) =>
                    setNewPerson((current) => ({
                      ...current,
                      phoneNumber: value.replace(/\D/g, "").slice(0, 20),
                    }))
                  }
                  placeholder="11999999999"
                />
                <SelectField
                  label="Tipo de vínculo"
                  value={relationshipType}
                  onChange={setRelationshipType}
                  options={relationshipOptions}
                />
              </div>
            </>
          )}

          {errorMessage && (
            <p className="text-sm font-semibold text-[#B42318]">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Salvando..." : "Confirmar vínculo"}
          </button>
        </form>
      </div>
    </ModalShell>
  );
}

function DeleteUnitModal({ unit, onClose, onDeleted }: DeleteUnitModalProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    try {
      setErrorMessage("");
      setIsSubmitting(true);
      await deleteUnit(unit.id);
      await onDeleted();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível excluir a unidade.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Excluir unidade" onClose={onClose}>
      <div className="space-y-6">
        <p className="text-sm font-semibold text-[#6B7280]">
          Você está prestes a excluir a unidade{" "}
          <span className="font-extrabold text-[#111827]">{unit.number}</span> do prédio{" "}
          <span className="font-extrabold text-[#111827]">{unit.buildingName}</span>.
        </p>

        <div className="grid grid-cols-1 gap-3 rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm md:grid-cols-2">
          <div>
            <span className="block text-xs font-extrabold uppercase tracking-wide text-[#6B7280]">
              Tipo
            </span>
            <strong className="mt-1 block text-[#111827]">
              {getUnitTypeLabel(unit.unitType)}
            </strong>
          </div>
          <div>
            <span className="block text-xs font-extrabold uppercase tracking-wide text-[#6B7280]">
              Status
            </span>
            <strong className="mt-1 block text-[#111827]">
              {unit.status || "Não informado"}
            </strong>
          </div>
          <div>
            <span className="block text-xs font-extrabold uppercase tracking-wide text-[#6B7280]">
              Moradores vinculados
            </span>
            <strong className="mt-1 block text-[#111827]">
              {unit.residentCount}
            </strong>
          </div>
          <div>
            <span className="block text-xs font-extrabold uppercase tracking-wide text-[#6B7280]">
              Responsável
            </span>
            <strong className="mt-1 block text-[#111827]">
              {unit.responsiblePersonName || "Sem responsável"}
            </strong>
          </div>
        </div>

        <p className="rounded-2xl border border-[#FECDCA] bg-[#FEE4E2] px-4 py-3 text-sm font-extrabold text-[#B42318]">
          Esta ação é permanente. Confirme apenas se a unidade não deve mais existir no condomínio.
        </p>

        {errorMessage && (
          <p className="text-sm font-semibold text-[#B42318]">
            {errorMessage}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#6B7280] transition hover:bg-[#F3F4F6]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isSubmitting}
            className="h-12 flex-1 cursor-pointer rounded-2xl bg-[#B42318] text-sm font-extrabold text-white transition hover:bg-[#912018] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Excluindo..." : "Excluir unidade"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

type UnitFormFieldsProps = {
  form: CreateUnitRequest;
  onChange: (form: CreateUnitRequest) => void;
};

function UnitFormFields({ form, onChange }: UnitFormFieldsProps) {
  function updateField<K extends keyof CreateUnitRequest>(field: K, value: CreateUnitRequest[K]) {
    onChange({
      ...form,
      [field]: value,
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          label="Número da unidade"
          value={form.number}
          onChange={(value) => updateField("number", value)}
          placeholder="101"
          maxLength={UNIT_FIELD_LIMITS.number}
          helper="Identificação da unidade dentro do prédio."
        />

        <SelectField
          label="Tipo"
          value={form.unitType}
          onChange={(value) => updateField("unitType", value)}
          options={unitTypeOptions}
          helper="Classificação usada para organizar a ocupação."
        />

        <NumberField
          label="Quartos"
          value={form.rooms}
          onChange={(value) => updateField("rooms", value)}
          max={UNIT_FIELD_LIMITS.rooms}
          helper="Use 0 quando não se aplicar."
        />

        <NumberField
          label="Banheiros"
          value={form.bathrooms}
          onChange={(value) => updateField("bathrooms", value)}
          max={UNIT_FIELD_LIMITS.bathrooms}
          helper="Quantidade cadastrada para a unidade."
        />

        <NumberField
          label="Área privativa"
          value={form.squareMeters}
          onChange={(value) => updateField("squareMeters", value)}
          max={UNIT_FIELD_LIMITS.squareMeters}
          step="0.01"
          helper="Informe a metragem em m²."
        />
      </div>

      <TextAreaField
        label="Observações"
        value={form.observations}
        onChange={(value) => updateField("observations", value)}
        placeholder="Ex.: posição da unidade, vaga vinculada, observações administrativas..."
        maxLength={UNIT_FIELD_LIMITS.observations}
        helper="Campo opcional para detalhes internos da gestão."
      />
    </>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  maxLength?: number;
};

function Field({ label, value, onChange, placeholder, helper, maxLength }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
      {helper && (
        <span className="mt-2 block text-xs font-semibold text-[#6B7280]">
          {helper}
        </span>
      )}
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
  max?: number;
  helper?: string;
};

function NumberField({ label, value, onChange, step = "1", max, helper }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="number"
        min="0"
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
      {helper && (
        <span className="mt-2 block text-xs font-semibold text-[#6B7280]">
          {helper}
        </span>
      )}
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: Array<{ value: number; label: string }>;
  disabled?: boolean;
  helper?: string;
};

function SelectField({ label, value, onChange, options, disabled = false, helper }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  function handleSelect(optionValue: number) {
    onChange(optionValue);
    setIsOpen(false);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold text-[#111827] outline-none transition disabled:cursor-not-allowed disabled:opacity-70 ${isOpen
            ? "border-[#22C55E] ring-4 ring-[#86EFAC]/30"
            : "border-[#E5E7EB] hover:border-[#86EFAC]"
          } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span>{selectedOption?.label ?? "Selecione"}</span>
        <span className={`text-[#6B7280] transition ${isOpen ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="morae-scrollbar absolute left-0 right-0 z-30 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[#D9DEE5] bg-white p-1 shadow-xl shadow-[#111827]/10">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option.value)}
                className={`flex min-h-10 w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-bold transition ${isSelected
                    ? "bg-[#DCFCE7] text-[#0B3D2E]"
                    : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                  }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {helper && (
        <span className="mt-2 block text-xs font-semibold text-[#6B7280]">
          {helper}
        </span>
      )}
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  maxLength?: number;
};

function TextAreaField({ label, value, onChange, placeholder, helper, maxLength }: TextAreaFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
      <span className="mt-2 flex justify-between gap-3 text-xs font-semibold text-[#6B7280]">
        {helper && <span>{helper}</span>}
        {maxLength && (
          <span className="ml-auto">
            {value.length}/{maxLength}
          </span>
        )}
      </span>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-bold text-[#111827] outline-none"
      />
    </label>
  );
}

function ReadOnlyTextArea({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <textarea
        value={value}
        readOnly
        className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm font-bold text-[#111827] outline-none"
      />
    </label>
  );
}
