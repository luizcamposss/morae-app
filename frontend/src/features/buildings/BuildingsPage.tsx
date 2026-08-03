import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { createBuilding, getBuildingById, getBuildingsByCondominium, updateBuilding } from "./buildingService";
import type { BuildingResponse, CreateBuildingRequest } from "./types";

const emptyBuildingForm: CreateBuildingRequest = {
  name: "",
  code: "",
  buildingType: "Residencial",
  floorCount: 0,
  hasElevator: false,
  notes: "",
};

const BUILDING_TYPE_OPTIONS = [
  "Residencial",
  "Comercial",
  "Misto",
  "Garagem",
  "Lazer",
];

const BUILDING_FIELD_LIMITS = {
  name: 100,
  code: 30,
  buildingType: 30,
  floorCount: 300,
  notes: 500,
};

function getBuildingStatusVariant(status: string) {
  return status === "Ativo" ? "success" as const : "warning" as const;
}

function getBuildingStatusLabel(status: string) {
  return status === "Atencao" ? "Atenção" : status;
}

export function BuildingsPage() {
  const navigate = useNavigate();
  const {
    condominiums,
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

  const filteredBuildings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return buildings;
    }

    return buildings.filter((building) =>
      building.name.toLowerCase().includes(normalizedSearch) ||
      building.code.toLowerCase().includes(normalizedSearch) ||
      building.buildingType.toLowerCase().includes(normalizedSearch) ||
      building.notes.toLowerCase().includes(normalizedSearch),
    );
  }, [buildings, searchTerm]);

  const totalBuildings = buildings.length;
  const totalUnits = buildings.reduce((sum, building) => sum + building.unitCount, 0);
  const occupiedUnits = buildings.reduce((sum, building) => sum + building.occupiedUnitCount, 0);
  const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const buildingsWithoutSyndic = buildings.filter((building) => !building.syndicUserId).length;

  const metrics = [
    {
      label: "Unidades cadastradas",
      value: totalUnits.toString(),
      helper: `${totalBuildings} prédio(s) na operação`,
    },
    {
      label: "Ocupação geral",
      value: `${occupancyRate}%`,
      helper: `${occupiedUnits} de ${totalUnits} unidade(s) ocupada(s)`,
    },
    {
      label: "Unidades vagas",
      value: vacantUnits.toString(),
      helper: "Disponíveis para vínculo",
    },
    {
      label: "Prédios sem síndico",
      value: buildingsWithoutSyndic.toString(),
      helper: "Precisam de responsável",
    },
  ];

  async function loadBuildings(condominiumId: number, options?: { clearSuccess?: boolean }) {
    try {
      setErrorMessage("");

      if (options?.clearSuccess ?? true) {
        setSuccessMessage("");
      }

      setIsLoadingBuildings(true);

      const result = await getBuildingsByCondominium(condominiumId);
      setBuildings(result);
    } catch (error) {
      setBuildings([]);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível carregar os prédios.");
      }
    } finally {
      setIsLoadingBuildings(false);
    }
  }

  async function refreshBuildings() {
    if (!activeCondominiumId) {
      return;
    }

    await loadBuildings(activeCondominiumId, { clearSuccess: false });
  }

  useEffect(() => {
    if (!activeCondominiumId) {
      setBuildings([]);
      setIsLoadingBuildings(false);
      return;
    }

    void loadBuildings(activeCondominiumId);
  }, [activeCondominiumId]);

  const isLoading = isLoadingCondominiums || isLoadingBuildings;
  const pageErrorMessage = condominiumErrorMessage || errorMessage;

  function handleOpenUnits(buildingId: number) {
    navigate(`/admin/units?buildingId=${buildingId}`);
  }

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
              Prédios
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Organize os blocos do condomínio, acompanhe ocupação e acesse as unidades.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            {condominiums.length > 1 && (
              <select
                value={activeCondominiumId ?? ""}
                onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
                className="h-11 min-w-72 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
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
              disabled={!activeCondominiumId}
              onClick={() => setIsCreateOpen(true)}
              className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
            >
              + Novo Prédio
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
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nome, código, tipo ou observação..."
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

          </div>

          {isLoading && (
            <p className="mb-4 text-sm font-semibold text-[#6B7280]">
              Carregando prédios...
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

          {!isLoading && filteredBuildings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-[#111827]">
                {searchTerm ? "Nenhum prédio encontrado" : "Nenhum prédio cadastrado"}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                {searchTerm
                  ? "Tente outro nome, código ou tipo para localizar o prédio."
                  : "Cadastre o primeiro prédio para organizar as unidades do condomínio."}
              </p>
              {!searchTerm && activeCondominiumId && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-6 h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                >
                  + Novo Prédio
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Prédio</th>
                    <th className="px-4 py-3 font-extrabold">Tipo</th>
                    <th className="px-4 py-3 font-extrabold">Andares</th>
                    <th className="px-4 py-3 font-extrabold">Elevador</th>
                    <th className="px-4 py-3 font-extrabold">Unidades</th>
                    <th className="px-4 py-3 font-extrabold">Moradores</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredBuildings.map((building) => (
                    <tr key={building.id} className="transition hover:bg-[#F3F4F6]">
                      <td className="px-4 py-4 font-extrabold text-[#111827]">
                        <div>{building.name}</div>
                        <div className="mt-1 text-xs font-semibold text-[#6B7280]">
                          {building.code}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {building.buildingType}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {building.floorCount}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {building.hasElevator ? "Sim" : "Não"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {building.unitCount}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {building.residentCount}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          label={getBuildingStatusLabel(building.status)}
                          variant={getBuildingStatusVariant(building.status)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingBuilding(building)}
                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBuilding(building)}
                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenUnits(building.id)}
                            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Unidades
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

      {isCreateOpen && activeCondominiumId && (
        <BuildingFormModal
          title="Cadastrar Novo Prédio"
          submitLabel="Cadastrar"
          initialForm={emptyBuildingForm}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (form) => {
            await createBuilding(activeCondominiumId, form);
            await refreshBuildings();
            setSuccessMessage("Prédio cadastrado com sucesso.");
          }}
        />
      )}

      {editingBuilding && (
        <BuildingFormModal
          title="Editar Prédio"
          submitLabel="Salvar alterações"
          initialForm={{
            name: editingBuilding.name,
            code: editingBuilding.code,
            buildingType: editingBuilding.buildingType,
            floorCount: editingBuilding.floorCount,
            hasElevator: editingBuilding.hasElevator,
            notes: editingBuilding.notes,
          }}
          onClose={() => setEditingBuilding(null)}
          onSubmit={async (form) => {
            await updateBuilding(editingBuilding.id, form);
            await refreshBuildings();
            setSuccessMessage("Prédio atualizado com sucesso.");
          }}
        />
      )}

      {viewingBuilding && (
        <ViewBuildingModal
          building={viewingBuilding}
          onClose={() => setViewingBuilding(null)}
        />
      )}
    </>
  );
}

type ModalShellProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

function ModalShell({ title, children, onClose }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
          <h2 className="text-2xl font-extrabold text-[#111827]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            x
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-8 py-7">
          {children}
        </div>
      </div>
    </div>
  );
}

type BuildingFormModalProps = {
  title: string;
  submitLabel: string;
  initialForm: CreateBuildingRequest;
  onClose: () => void;
  onSubmit: (form: CreateBuildingRequest) => Promise<void>;
};

function BuildingFormModal({
  title,
  submitLabel,
  initialForm,
  onClose,
  onSubmit,
}: BuildingFormModalProps) {
  const [form, setForm] = useState<CreateBuildingRequest>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof CreateBuildingRequest>(
    field: K,
    value: CreateBuildingRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const payload: CreateBuildingRequest = {
      name: form.name.trim(),
      code: form.code.trim(),
      buildingType: form.buildingType.trim(),
      floorCount: Number(form.floorCount),
      hasElevator: form.hasElevator,
      notes: form.notes.trim(),
    };

    if (!payload.name || !payload.code || !payload.buildingType) {
      setErrorMessage("Informe nome, código e tipo do prédio.");
      return;
    }

    if (payload.name.length > BUILDING_FIELD_LIMITS.name) {
      setErrorMessage("O nome do prédio deve ter no máximo 100 caracteres.");
      return;
    }

    if (payload.code.length > BUILDING_FIELD_LIMITS.code) {
      setErrorMessage("O código do prédio deve ter no máximo 30 caracteres.");
      return;
    }

    if (payload.buildingType.length > BUILDING_FIELD_LIMITS.buildingType) {
      setErrorMessage("O tipo do prédio deve ter no máximo 30 caracteres.");
      return;
    }

    if (payload.notes.length > BUILDING_FIELD_LIMITS.notes) {
      setErrorMessage("As observações devem ter no máximo 500 caracteres.");
      return;
    }

    if (
      Number.isNaN(payload.floorCount) ||
      payload.floorCount < 0 ||
      payload.floorCount > BUILDING_FIELD_LIMITS.floorCount
    ) {
      setErrorMessage("Informe uma quantidade de andares entre 0 e 300.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível salvar o prédio.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Nome do prédio"
            value={form.name}
            onChange={(value) => updateField("name", value)}
            placeholder="Prédio A"
            maxLength={BUILDING_FIELD_LIMITS.name}
            helper="Nome oficial do bloco ou torre dentro do condomínio."
          />
          <Field
            label="Código/identificação"
            value={form.code}
            onChange={(value) => updateField("code", value)}
            placeholder="BLOCO-A"
            maxLength={BUILDING_FIELD_LIMITS.code}
            helper="Identificador curto e único para este condomínio."
          />
          <SelectField
            label="Tipo do prédio"
            value={form.buildingType}
            onChange={(value) => updateField("buildingType", value)}
            options={BUILDING_TYPE_OPTIONS}
            helper="Classificação usada para organizar a operação."
          />
          <NumberField
            label="Quantidade de andares"
            value={form.floorCount}
            onChange={(value) => updateField("floorCount", value)}
            min={0}
            max={BUILDING_FIELD_LIMITS.floorCount}
            placeholder="12"
            helper="Use 0 quando o prédio não tiver andares aplicáveis."
          />
        </div>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4">
          <span>
            <span className="block text-sm font-extrabold text-[#111827]">
              Possui elevador?
            </span>
            <span className="mt-1 block text-xs font-semibold text-[#6B7280]">
              Marque quando o prédio tiver elevador operacional.
            </span>
          </span>
          <input
            type="checkbox"
            checked={form.hasElevator}
            onChange={(event) => updateField("hasElevator", event.target.checked)}
            className="size-5 cursor-pointer accent-[#16A34A]"
          />
        </label>

        <TextAreaField
          label="Observações"
          value={form.notes}
          onChange={(value) => updateField("notes", value)}
          placeholder="Ex.: torre principal, acesso pela portaria social, elevador em manutenção..."
          maxLength={BUILDING_FIELD_LIMITS.notes}
          helper="Campo opcional para regras de acesso, manutenção ou detalhes internos."
        />

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
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </form>
    </ModalShell>
  );
}

type ViewBuildingModalProps = {
  building: BuildingResponse;
  onClose: () => void;
};

function ViewBuildingModal({ building, onClose }: ViewBuildingModalProps) {
  const [buildingDetails, setBuildingDetails] = useState<BuildingResponse | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [detailsErrorMessage, setDetailsErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadBuildingDetails() {
      try {
        setIsLoadingDetails(true);
        setDetailsErrorMessage("");

        const result = await getBuildingById(building.id);

        if (isMounted) {
          setBuildingDetails(result);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof Error) {
          setDetailsErrorMessage(error.message);
        } else {
          setDetailsErrorMessage("Não foi possível carregar os detalhes do prédio.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingDetails(false);
        }
      }
    }

    void loadBuildingDetails();

    return () => {
      isMounted = false;
    };
  }, [building.id]);

  const details = buildingDetails ?? building;

  return (
    <ModalShell title="Detalhes do Prédio" onClose={onClose}>
      <div className="space-y-6">
        {isLoadingDetails && (
          <p className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-3 text-sm font-bold text-[#6B7280]">
            Carregando detalhes atualizados...
          </p>
        )}

        {detailsErrorMessage && (
          <p className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
            {detailsErrorMessage}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReadOnlyField label="Nome do prédio" value={details.name} />
          <ReadOnlyField label="Código" value={details.code} />
          <ReadOnlyField label="Tipo" value={details.buildingType} />
          <ReadOnlyField label="Andares" value={details.floorCount.toString()} />
          <ReadOnlyField label="Elevador" value={details.hasElevator ? "Sim" : "Não"} />
          <ReadOnlyField label="Status" value={getBuildingStatusLabel(details.status)} />
          <ReadOnlyField label="Unidades" value={details.unitCount.toString()} />
          <ReadOnlyField label="Moradores vinculados" value={details.residentCount.toString()} />
          <ReadOnlyField label="Unidades ocupadas" value={details.occupiedUnitCount.toString()} />
          <ReadOnlyField
            label="Síndico do condomínio"
            value={details.syndicName || "Nenhum síndico vinculado"}
          />
          <ReadOnlyField
            label="E-mail do síndico"
            value={details.syndicEmail || "Não informado"}
          />
        </div>

        <ReadOnlyTextAreaField
          label="Observações"
          value={details.notes || "Nenhuma observação cadastrada."}
        />

      </div>
    </ModalShell>
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

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  helper?: string;
};

function SelectField({ label, value, onChange, options, helper }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(option: string) {
    onChange(option);
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
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold text-[#111827] outline-none transition ${
          isOpen
            ? "border-[#22C55E] ring-4 ring-[#86EFAC]/30"
            : "border-[#E5E7EB] hover:border-[#86EFAC]"
        }`}
      >
        <span>{value}</span>
        <span className={`text-[#6B7280] transition ${isOpen ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-[#D9DEE5] bg-white p-1 shadow-xl shadow-[#111827]/10">
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
                className={`flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-bold transition ${
                  isSelected
                    ? "bg-[#DCFCE7] text-[#0B3D2E]"
                    : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                }`}
              >
                {option}
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

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  helper?: string;
};

function NumberField({ label, value, onChange, min, max, placeholder, helper }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        placeholder={placeholder}
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
        rows={4}
        className="w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
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

function ReadOnlyTextAreaField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <textarea
        value={value}
        readOnly
        rows={4}
        className="w-full resize-none rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm font-bold text-[#111827] outline-none"
      />
    </label>
  );
}
