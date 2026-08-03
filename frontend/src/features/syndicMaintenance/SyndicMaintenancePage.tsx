import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import { createOccurrence, getOccurrencesByCondominium, updateOccurrenceStatus } from "../occurrences/occurrenceService";
import type {
  OccurrencePriority,
  OccurrenceResponse,
  OccurrenceStatus,
  OccurrenceType,
} from "../occurrences/types";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";

type UnitOption = UnitResponse & {
  buildingName: string;
};

const occurrenceStatusOptions: Array<{ label: string; value: OccurrenceStatus }> = [
  { label: "Aberta", value: 1 },
  { label: "Em andamento", value: 2 },
  { label: "Resolvida", value: 3 },
  { label: "Cancelada", value: 4 },
];

export function SyndicMaintenancePage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [occurrences, setOccurrences] = useState<OccurrenceResponse[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData(condominiumId: number) {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [loadedOccurrences, buildings] = await Promise.all([
        getOccurrencesByCondominium(condominiumId),
        getBuildingsByCondominium(condominiumId),
      ]);
      const unitsByBuilding = await Promise.all(
        buildings.map(async (building) => {
          const buildingUnits = await getUnitsByBuilding(building.id);
          return buildingUnits.map((unit) => ({
            ...unit,
            buildingName: building.name,
          }));
        }),
      );

      setOccurrences(loadedOccurrences);
      setUnits(unitsByBuilding.flat());
    } catch (error) {
      setOccurrences([]);
      setUnits([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as ocorrências.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!activeCondominiumId) {
      setOccurrences([]);
      setUnits([]);
      setIsLoading(false);
      return;
    }

    void loadData(activeCondominiumId);
  }, [activeCondominiumId]);

  const filteredOccurrences = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return occurrences;

    return occurrences.filter((occurrence) =>
      [
        occurrence.title,
        occurrence.description,
        getTypeLabel(occurrence.type),
        getUnitLabel(occurrence.unitId, units),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [occurrences, searchTerm, units]);

  const openCount = occurrences.filter((occurrence) => occurrence.status === 1).length;
  const inProgressCount = occurrences.filter((occurrence) => occurrence.status === 2).length;
  const resolvedCount = occurrences.filter((occurrence) => occurrence.status === 3).length;
  const highPriorityCount = occurrences.filter(
    (occurrence) => occurrence.priority === 3 || occurrence.priority === 4,
  ).length;

  async function handleStatusChange(id: number, status: OccurrenceStatus) {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await updateOccurrenceStatus(id, { status });

      if (activeCondominiumId) {
        await loadData(activeCondominiumId);
      }

      setSuccessMessage("Status da ocorrência atualizado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a ocorrência.",
      );
    }
  }

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.38em] text-[#16A34A]">
              Ocorrências
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
              Gestão de ocorrências
            </h1>
            <p className="mt-2 text-sm font-semibold text-[#6B7280]">
              Acompanhe solicitações reais de {activeCondominium?.condominiumName ?? "seu condomínio"}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={!activeCondominiumId || units.length === 0}
            className="h-11 cursor-pointer rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Nova ocorrência
          </button>
        </div>

        {(errorMessage || successMessage) && (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${
              errorMessage
                ? "border-[#FECACA] bg-[#FDECEC] text-[#B42318]"
                : "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]"
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Abertas" value={openCount.toString()} helper="Aguardando análise" />
          <MetricCard label="Em andamento" value={inProgressCount.toString()} helper="Em atendimento" />
          <MetricCard label="Concluídas" value={resolvedCount.toString()} helper="Resolvidas" />
          <MetricCard label="Prioridade alta" value={highPriorityCount.toString()} helper="Alta ou urgente" />
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar ocorrência, descrição ou unidade..."
            className="mb-4 h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
          />

          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Título</th>
                    <th className="px-4 py-3 font-extrabold">Unidade</th>
                    <th className="px-4 py-3 font-extrabold">Tipo</th>
                    <th className="px-4 py-3 font-extrabold">Prioridade</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                        Carregando ocorrências...
                      </td>
                    </tr>
                  ) : filteredOccurrences.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center font-bold text-[#6B7280]">
                        Nenhuma ocorrência encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredOccurrences.map((occurrence) => (
                      <tr key={occurrence.id} className="transition hover:bg-[#F3F4F6]">
                        <td className="px-4 py-4">
                          <p className="font-extrabold text-[#111827]">{occurrence.title}</p>
                          <p className="mt-1 max-w-xl text-xs font-semibold text-[#6B7280]">
                            {occurrence.description}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#6B7280]">
                          {getUnitLabel(occurrence.unitId, units)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge
                            label={getTypeLabel(occurrence.type)}
                            variant="neutral"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge
                            label={getPriorityLabel(occurrence.priority)}
                            variant={getPriorityVariant(occurrence.priority)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge
                            label={getStatusLabel(occurrence.status)}
                            variant={getStatusVariant(occurrence.status)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <StatusSelectField
                            value={occurrence.status}
                            onChange={(value) => void handleStatusChange(occurrence.id, value)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {isCreateOpen && activeCondominiumId && (
        <CreateOccurrenceModal
          condominiumId={activeCondominiumId}
          units={units}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            await loadData(activeCondominiumId);
            setSuccessMessage("Ocorrência criada.");
          }}
        />
      )}
    </>
  );
}

type CreateOccurrenceModalProps = {
  condominiumId: number;
  units: UnitOption[];
  onClose: () => void;
  onCreated: () => Promise<void>;
};

function CreateOccurrenceModal({
  condominiumId,
  units,
  onClose,
  onCreated,
}: CreateOccurrenceModalProps) {
  const [form, setForm] = useState({
    unitId: units[0]?.id.toString() ?? "",
    title: "",
    description: "",
    type: "1",
    priority: "2",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const unitOptions = units.map((unit) => ({
    label: `${unit.buildingName} - Unidade ${unit.number}`,
    value: unit.id.toString(),
  }));
  const typeOptions = [
    { label: "Manutenção", value: "1" },
    { label: "Segurança", value: "2" },
    { label: "Limpeza", value: "3" },
    { label: "Barulho", value: "4" },
    { label: "Área comum", value: "5" },
    { label: "Outro", value: "6" },
  ];
  const priorityOptions = [
    { label: "Baixa", value: "1" },
    { label: "Média", value: "2" },
    { label: "Alta", value: "3" },
    { label: "Urgente", value: "4" },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.unitId) {
      setErrorMessage("Selecione uma unidade.");
      return;
    }

    if (form.title.trim().length < 3) {
      setErrorMessage("Informe um título com pelo menos 3 caracteres.");
      return;
    }

    if (form.description.trim().length < 5) {
      setErrorMessage("Informe uma descrição com pelo menos 5 caracteres.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await createOccurrence({
        condominiumId,
        unitId: Number(form.unitId),
        title: form.title.trim(),
        description: form.description.trim(),
        type: Number(form.type) as OccurrenceType,
        priority: Number(form.priority) as OccurrencePriority,
      });

      await onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a ocorrência.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="max-h-[calc(100vh-4rem)] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
          <h2 className="text-2xl font-black text-[#111827]">Nova ocorrência</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-8">
          <SelectField
            label="Unidade"
            value={form.unitId}
            options={unitOptions}
            onChange={(value) => setForm((current) => ({ ...current, unitId: value }))}
          />

          <TextField
            label="Título"
            value={form.title}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          />

          <SelectField
            label="Tipo"
            value={form.type}
            options={typeOptions}
            onChange={(value) => setForm((current) => ({ ...current, type: value }))}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[#111827]">Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-32 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />
          </label>

          <SelectField
            label="Prioridade"
            value={form.priority}
            options={priorityOptions}
            onChange={(value) => setForm((current) => ({ ...current, priority: value }))}
          />

          {errorMessage && (
            <p className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-black text-white shadow-sm shadow-[#16A34A]/25 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Criando..." : "Criar ocorrência"}
          </button>
        </div>
      </form>
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#111827]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <span className="mb-2 block text-sm font-black text-[#111827]">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold text-[#111827] outline-none transition ${
          isOpen
            ? "border-[#22C55E] ring-4 ring-[#86EFAC]/30"
            : "border-[#E5E7EB] hover:border-[#BBF7D0]"
        }`}
      >
        <span>{selectedOption?.label ?? "Selecione"}</span>
        <span className={`text-[#6B7280] transition ${isOpen ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-[#D9DEE5] bg-white p-1 shadow-xl shadow-[#111827]/10">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex min-h-10 w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                  isSelected
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
    </div>
  );
}

function StatusSelectField({
  value,
  onChange,
}: {
  value: OccurrenceStatus;
  onChange: (value: OccurrenceStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = occurrenceStatusOptions.find((option) => option.value === value);

  return (
    <div className="relative w-36">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-9 w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-3 text-left text-xs font-black outline-none transition ${
          isOpen
            ? "border-[#22C55E] text-[#0B3D2E] ring-4 ring-[#86EFAC]/30"
            : "border-[#E5E7EB] text-[#6B7280] hover:border-[#BBF7D0] hover:text-[#0B3D2E]"
        }`}
      >
        <span>{selectedOption?.label ?? "Status"}</span>
        <span className={`text-[#6B7280] transition ${isOpen ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-11 z-30 w-full overflow-hidden rounded-2xl border border-[#D9DEE5] bg-white p-1 shadow-xl shadow-[#111827]/10">
          {occurrenceStatusOptions.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex min-h-9 w-full cursor-pointer items-center rounded-xl px-3 text-left text-xs font-black transition ${
                  isSelected
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
    </div>
  );
}

function getUnitLabel(unitId: number, units: UnitOption[]) {
  const unit = units.find((item) => item.id === unitId);

  if (!unit) return `Unidade ${unitId}`;

  return `${unit.buildingName} - Unidade ${unit.number}`;
}

function getStatusLabel(status: OccurrenceStatus) {
  if (status === 1) return "Aberta";
  if (status === 2) return "Em andamento";
  if (status === 3) return "Resolvida";
  if (status === 4) return "Cancelada";
  return "Indefinida";
}

function getStatusVariant(status: OccurrenceStatus) {
  if (status === 1) return "warning";
  if (status === 2) return "neutral";
  if (status === 3) return "success";
  if (status === 4) return "danger";
  return "neutral";
}

function getTypeLabel(type: OccurrenceType) {
  if (type === 1) return "Manutenção";
  if (type === 2) return "Segurança";
  if (type === 3) return "Limpeza";
  if (type === 4) return "Barulho";
  if (type === 5) return "Área comum";
  if (type === 6) return "Outro";
  return "Não informado";
}

function getPriorityLabel(priority: OccurrencePriority) {
  if (priority === 1) return "Baixa";
  if (priority === 2) return "Média";
  if (priority === 3) return "Alta";
  if (priority === 4) return "Urgente";
  return "Indefinida";
}

function getPriorityVariant(priority: OccurrencePriority) {
  if (priority === 4) return "danger";
  if (priority === 3) return "warning";
  if (priority === 2) return "neutral";
  return "success";
}
