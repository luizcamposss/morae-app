import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { createBuilding, getBuildingsByCondominium, updateBuilding } from "./buildingService";
import type { BuildingResponse, CreateBuildingRequest } from "./types";

const emptyBuildingForm: CreateBuildingRequest = {
  name: "",
  code: "",
  buildingType: "Residencial",
  floorCount: 0,
  hasElevator: false,
  notes: "",
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
  const totalFloors = buildings.reduce((sum, building) => sum + building.floorCount, 0);
  const buildingsWithElevator = buildings.filter((building) => building.hasElevator).length;
  const occupiedBuildings = buildings.filter((building) => building.occupiedUnitCount > 0).length;

  const metrics = [
    { label: "Total", value: totalBuildings.toString(), helper: "Prédios cadastrados" },
    { label: "Ocupados", value: occupiedBuildings.toString(), helper: "Com unidades ocupadas" },
    { label: "Andares", value: totalFloors.toString(), helper: "Somados entre os prédios" },
    { label: "Elevadores", value: buildingsWithElevator.toString(), helper: `${totalUnits} unidades no total` },
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
              Cadastre blocos, acompanhe ocupação e acesse as unidades do condomínio.
            </p>
            {activeCondominium && (
              <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                Condomínio ativo: {activeCondominium.condominiumName}
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
              disabled={!activeCondominiumId}
              onClick={() => setIsCreateOpen(true)}
              className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
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
            <input
              type="search"
              placeholder="Buscar por nome, código, tipo ou observação..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3E2E]"
            >
              Todos
            </button>
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
                  className="mt-6 h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
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
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBuilding(building)}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenUnits(building.id)}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
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

          <p className="mt-4 text-sm font-semibold text-[#6B7280]">
            Esta tela usa dados reais do backend e respeita o condomínio ativo do usuário.
          </p>
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
            className="flex size-10 items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
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

    if (Number.isNaN(payload.floorCount) || payload.floorCount < 0) {
      setErrorMessage("Informe uma quantidade de andares válida.");
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
          />
          <Field
            label="Código/identificação"
            value={form.code}
            onChange={(value) => updateField("code", value)}
            placeholder="BLOCO-A"
          />
          <SelectField
            label="Tipo do prédio"
            value={form.buildingType}
            onChange={(value) => updateField("buildingType", value)}
            options={["Residencial", "Comercial", "Misto", "Garagem", "Lazer"]}
          />
          <NumberField
            label="Quantidade de andares"
            value={form.floorCount}
            onChange={(value) => updateField("floorCount", value)}
            min={0}
            placeholder="12"
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
        />

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
  return (
    <ModalShell title="Detalhes do Prédio" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReadOnlyField label="Nome do prédio" value={building.name} />
          <ReadOnlyField label="Código" value={building.code} />
          <ReadOnlyField label="Tipo" value={building.buildingType} />
          <ReadOnlyField label="Andares" value={building.floorCount.toString()} />
          <ReadOnlyField label="Elevador" value={building.hasElevator ? "Sim" : "Não"} />
          <ReadOnlyField label="Status" value={getBuildingStatusLabel(building.status)} />
          <ReadOnlyField label="Unidades" value={building.unitCount.toString()} />
          <ReadOnlyField label="Moradores vinculados" value={building.residentCount.toString()} />
          <ReadOnlyField label="Unidades ocupadas" value={building.occupiedUnitCount.toString()} />
        </div>

        <ReadOnlyTextAreaField
          label="Observações"
          value={building.notes || "Nenhuma observação cadastrada."}
        />

        <ReadOnlyField
          label="Criado em"
          value={new Date(building.createdAt).toLocaleString("pt-BR")}
        />
        <ReadOnlyField
          label="Atualizado em"
          value={new Date(building.updatedAt).toLocaleString("pt-BR")}
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

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  placeholder?: string;
};

function NumberField({ label, value, onChange, min, placeholder }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
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
        rows={4}
        className="w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
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
