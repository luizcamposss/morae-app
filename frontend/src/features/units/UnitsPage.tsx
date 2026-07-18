import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useCondominium } from "../../app/providers/useCondominium";
import { createPersonInCondominium, getPersons } from "../persons/personService";
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
  { value: 1, label: "Proprietario" },
  { value: 2, label: "Morador" },
  { value: 3, label: "Inquilino" },
];

function getUnitTypeLabel(unitType: number) {
  return unitTypeOptions.find((option) => option.value === unitType)?.label ?? "Nao informado";
}

function getRelationshipLabel(relationshipType: number) {
  return relationshipOptions.find((option) => option.value === relationshipType)?.label ?? "Nao informado";
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
    activeCondominium,
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

  const selectedBuilding = availableBuildings.find((building) => building.id === selectedBuildingId) ?? null;

  const filteredUnits = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return units;
    }

    return units.filter((unit) =>
      unit.number.toLowerCase().includes(normalizedSearch) ||
      unit.buildingName.toLowerCase().includes(normalizedSearch) ||
      unit.responsiblePersonName.toLowerCase().includes(normalizedSearch),
    );
  }, [searchTerm, units]);

  const totalUnits = units.length;
  const occupiedUnits = units.filter((unit) => unit.status === "Ocupada").length;
  const vacantUnits = units.filter((unit) => unit.status === "Vaga").length;
  const totalResidents = units.reduce((sum, unit) => sum + unit.residentCount, 0);

  const metrics = [
    {
      label: "Total",
      value: totalUnits.toString(),
      helper: "Unidades cadastradas",
    },
    {
      label: "Ocupadas",
      value: occupiedUnits.toString(),
      helper: "Com morador vinculado",
    },
    {
      label: "Vagas",
      value: vacantUnits.toString(),
      helper: "Sem morador vinculado",
    },
    {
      label: "Moradores",
      value: totalResidents.toString(),
      helper: "Vinculos encontrados",
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
        setErrorMessage("Nao foi possivel carregar os predios.");
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
        setErrorMessage("Nao foi possivel carregar as unidades.");
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
              Gerencie apartamentos, responsaveis e ocupacao das unidades.
            </p>
            {activeCondominium && (
              <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                Condominio ativo: {activeCondominium.condominiumName}
              </p>
            )}
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
              className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
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
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,280px)_1fr_auto]">
            <select
              value={selectedBuildingId ?? ""}
              onChange={(event) => handleBuildingChange(Number(event.target.value))}
              disabled={availableBuildings.length === 0}
              className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {availableBuildings.length === 0 ? (
                <option value="">Nenhum predio disponivel</option>
              ) : (
                availableBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))
              )}
            </select>

            <input
              type="search"
              placeholder="Buscar unidade, predio ou responsavel..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
            >
              Todos
            </button>
          </div>

          {selectedBuilding && (
            <p className="mb-4 text-sm font-semibold text-[#6B7280]">
              Predio selecionado: <span className="text-[#111827]">{selectedBuilding.name}</span>
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
                  : "Cadastre a primeira unidade deste predio para continuar."}
              </p>
              {!searchTerm && selectedBuildingId && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-6 h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
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
                    <th className="px-4 py-3 font-extrabold">Predio</th>
                    <th className="px-4 py-3 font-extrabold">Unidade</th>
                    <th className="px-4 py-3 font-extrabold">Tipo</th>
                    <th className="px-4 py-3 font-extrabold">Responsavel</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Acoes</th>
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
                        {unit.responsiblePersonName || "Sem responsavel"}
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
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUnit(unit)}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinkingUnit(unit)}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Vincular pessoa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUnit(unit)}
                            className="rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]"
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

          <p className="mt-4 text-sm font-semibold text-[#6B7280]">
            Este modulo agora cobre cadastro, edicao, visualizacao, ocupacao e exclusao de unidades.
          </p>
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
      <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
          <h2 className="text-2xl font-extrabold text-[#111827]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            x
          </button>
        </div>

        <div className="px-8 py-7">
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
    setIsSubmitting(true);

    try {
      await createUnit(buildingId, form);
      await onCreated();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel cadastrar a unidade.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Cadastrar Nova Unidade" onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <ReadOnlyField label="Predio" value={buildingName} />
        <UnitFormFields form={form} onChange={setForm} />

        {errorMessage && (
          <p className="text-sm font-semibold text-[#B42318]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
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
    setIsSubmitting(true);

    try {
      await updateUnit(unit.id, form);
      await onUpdated();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel atualizar a unidade.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Editar Unidade" onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <ReadOnlyField label="Predio" value={unit.buildingName} />
        <UnitFormFields form={form} onChange={setForm} />

        {errorMessage && (
          <p className="text-sm font-semibold text-[#B42318]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </form>
    </ModalShell>
  );
}

function ViewUnitModal({ unit, onClose }: ViewUnitModalProps) {
  const [linkedPeople, setLinkedPeople] = useState<PersonUnitResponse[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
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
          setErrorMessage("Nao foi possivel carregar os vinculos da unidade.");
        }
      } finally {
        setIsLoadingPeople(false);
      }
    }

    void loadLinkedPeople();
  }, [unit.id]);

  return (
    <ModalShell title="Detalhes da Unidade" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReadOnlyField label="Predio" value={unit.buildingName} />
          <ReadOnlyField label="Unidade" value={unit.number} />
          <ReadOnlyField label="Tipo" value={getUnitTypeLabel(unit.unitType)} />
          <ReadOnlyField label="Status" value={unit.status} />
          <ReadOnlyField label="Quartos" value={unit.rooms.toString()} />
          <ReadOnlyField label="Banheiros" value={unit.bathrooms.toString()} />
          <ReadOnlyField label="Metros quadrados" value={unit.squareMeters.toString()} />
          <ReadOnlyField label="Moradores vinculados" value={unit.residentCount.toString()} />
          <ReadOnlyField
            label="Responsavel"
            value={unit.responsiblePersonName || "Sem responsavel"}
          />
        </div>

        <ReadOnlyTextArea
          label="Observacoes"
          value={unit.observations || "Sem observacoes"}
        />

        <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#0B3D2E]">
            Pessoas vinculadas
          </h3>

          {isLoadingPeople && (
            <p className="mt-3 text-sm font-semibold text-[#6B7280]">
              Carregando vinculos...
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
                  className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-extrabold text-[#111827]">
                      {linkedPerson.personName}
                    </p>
                    <p className="text-xs font-semibold text-[#6B7280]">
                      {getRelationshipLabel(linkedPerson.relationshipType)}
                    </p>
                  </div>

                  <StatusBadge
                    label={getRelationshipLabel(linkedPerson.relationshipType)}
                    variant="neutral"
                  />
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
        getPersons(),
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
        setErrorMessage("Nao foi possivel carregar os dados da unidade.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [unit.id]);

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
        setErrorMessage("Nao foi possivel vincular a pessoa.");
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
        setErrorMessage("Nao foi possivel remover o vinculo.");
      }
    }
  }

  return (
    <ModalShell title="Vincular Pessoas a Unidade" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReadOnlyField label="Predio" value={unit.buildingName} />
          <ReadOnlyField label="Unidade" value={unit.number} />
        </div>

        <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#0B3D2E]">
            Vinculos atuais
          </h3>

          {isLoading && (
            <p className="mt-3 text-sm font-semibold text-[#6B7280]">
              Carregando vinculos...
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
                    className="rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEC]"
                  >
                    Remover vinculo
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
              className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition ${
                mode === "existing"
                  ? "bg-[#16A34A] text-white"
                  : "border border-[#E5E7EB] bg-white text-[#6B7280]"
              }`}
            >
              Pessoa existente
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition ${
                mode === "new"
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
                label="Tipo de vinculo"
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
                  label="Tipo de vinculo"
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
            className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Salvando..." : "Confirmar vinculo"}
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
        setErrorMessage("Nao foi possivel excluir a unidade.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Excluir Unidade" onClose={onClose}>
      <div className="space-y-6">
        <p className="text-sm font-semibold text-[#6B7280]">
          Esta acao vai excluir a unidade <span className="text-[#111827]">{unit.number}</span> do predio{" "}
          <span className="text-[#111827]">{unit.buildingName}</span>.
        </p>

        <p className="text-sm font-semibold text-[#B42318]">
          Use esta acao apenas quando tiver certeza.
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
            className="h-12 flex-1 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#6B7280] transition hover:bg-[#F3F4F6]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isSubmitting}
            className="h-12 flex-1 rounded-2xl bg-[#B42318] text-sm font-extrabold text-white transition hover:bg-[#912018] disabled:cursor-not-allowed disabled:opacity-70"
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
          label="Numero da unidade"
          value={form.number}
          onChange={(value) => updateField("number", value)}
          placeholder="101"
        />

        <SelectField
          label="Tipo"
          value={form.unitType}
          onChange={(value) => updateField("unitType", value)}
          options={unitTypeOptions}
        />

        <NumberField
          label="Quartos"
          value={form.rooms}
          onChange={(value) => updateField("rooms", value)}
        />

        <NumberField
          label="Banheiros"
          value={form.bathrooms}
          onChange={(value) => updateField("bathrooms", value)}
        />

        <NumberField
          label="Metros quadrados"
          value={form.squareMeters}
          onChange={(value) => updateField("squareMeters", value)}
          step="0.01"
        />
      </div>

      <TextAreaField
        label="Observacoes"
        value={form.observations}
        onChange={(value) => updateField("observations", value)}
        placeholder="Opcional"
      />
    </>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function Field({ label, value, onChange, placeholder }: FieldProps) {
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
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
};

function NumberField({ label, value, onChange, step = "1" }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: Array<{ value: number; label: string }>;
  disabled?: boolean;
};

function SelectField({ label, value, onChange, options, disabled = false }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function TextAreaField({ label, value, onChange, placeholder }: TextAreaFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
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
