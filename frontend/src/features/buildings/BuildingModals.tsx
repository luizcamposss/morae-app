import { useEffect, useState, type FormEvent } from "react";
import { Building2 } from "lucide-react";
import { Button, ButtonLink } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { getBuildingById } from "./buildingService";
import { BUILDING_FIELD_LIMITS, BUILDING_TYPE_OPTIONS, buildingStatusLabel, occupancyOf, validateBuildingForm } from "./buildingForm";
import type { BuildingResponse, CreateBuildingRequest } from "./types";

type BuildingFormModalProps = {
  title: string;
  submitLabel: string;
  initialForm: CreateBuildingRequest;
  onClose: () => void;
  onSubmit: (form: CreateBuildingRequest) => Promise<void>;
};

export function BuildingFormModal({ title, submitLabel, initialForm, onClose, onSubmit }: BuildingFormModalProps) {
  const [form, setForm] = useState<CreateBuildingRequest>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof CreateBuildingRequest>(field: K, value: CreateBuildingRequest[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: CreateBuildingRequest = {
      name: form.name.trim(),
      code: form.code.trim(),
      buildingType: form.buildingType.trim(),
      floorCount: Number(form.floorCount),
      hasElevator: form.hasElevator,
      notes: form.notes.trim(),
    };

    const problem = validateBuildingForm(payload);
    setErrorMessage(problem);
    if (problem) return;

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o prédio.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="building-form" isLoading={isSubmitting} loadingText="Salvando…">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="building-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Nome do prédio"
            value={form.name}
            maxLength={BUILDING_FIELD_LIMITS.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Torre A"
          />
          <TextField
            label="Código"
            value={form.code}
            maxLength={BUILDING_FIELD_LIMITS.code}
            onChange={(event) => updateField("code", event.target.value)}
            placeholder="BLOCO-A"
            hint="Curto e único neste condomínio."
          />
          <SelectField
            label="Tipo"
            value={form.buildingType}
            onChange={(event) => updateField("buildingType", event.target.value)}
            options={BUILDING_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))}
          />
          <TextField
            label="Andares"
            type="number"
            inputMode="numeric"
            min={0}
            max={BUILDING_FIELD_LIMITS.floorCount}
            value={form.floorCount}
            onChange={(event) => updateField("floorCount", Number(event.target.value))}
            hint="Use 0 quando não se aplica."
          />
        </div>

        <div className="rounded-block bg-campo px-4">
          <Switch
            label="Tem elevador"
            description="Ligue se o prédio tiver elevador funcionando."
            checked={form.hasElevator}
            onChange={(checked) => updateField("hasElevator", checked)}
          />
        </div>

        <TextAreaField
          label="Observações"
          value={form.notes}
          maxLength={BUILDING_FIELD_LIMITS.notes}
          rows={3}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Ex.: acesso pela portaria social, elevador em manutenção…"
        />
      </form>
    </Modal>
  );
}

type BuildingDetailsModalProps = {
  building: BuildingResponse;
  onClose: () => void;
  onEdit: () => void;
};

export function BuildingDetailsModal({ building, onClose, onEdit }: BuildingDetailsModalProps) {
  const [details, setDetails] = useState<BuildingResponse>(building);
  const [errorMessage, setErrorMessage] = useState("");

  // The list already has the data; this refreshes it with the latest counts.
  useEffect(() => {
    let isMounted = true;

    getBuildingById(building.id)
      .then((result) => isMounted && setDetails(result))
      .catch((error) => {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os detalhes do prédio.");
      });

    return () => {
      isMounted = false;
    };
  }, [building.id]);

  const occupancy = occupancyOf(details);
  const vacant = Math.max(details.unitCount - details.occupiedUnitCount, 0);

  return (
    <Modal
      title={details.name}
      description={`${details.code} · ${details.buildingType}`}
      leading={
        <span className="grid size-11 place-items-center rounded-block bg-verde-suave text-verde-tinta">
          <Building2 size={20} strokeWidth={1.8} aria-hidden />
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onEdit}>
            Editar
          </Button>
          <ButtonLink to={`/admin/units?buildingId=${details.id}`}>Ver unidades</ButtonLink>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <div className="rounded-block bg-campo px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-tinta">Ocupação</p>
            <p className="font-display text-xl font-bold tabular-nums text-tinta">{occupancy}%</p>
          </div>
          <OccupancyBar value={occupancy} className="mt-2" />
          <p className="mt-2 text-[13px] text-tinta-suave">
            {details.occupiedUnitCount} de {details.unitCount} unidade{details.unitCount === 1 ? "" : "s"} ocupada{details.occupiedUnitCount === 1 ? "" : "s"} ·{" "}
            {vacant} vaga{vacant === 1 ? "" : "s"}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Info label="Andares" value={String(details.floorCount)} />
          <Info label="Elevador" value={details.hasElevator ? "Sim" : "Não"} />
          <Info label="Moradores" value={String(details.residentCount)} />
          <Info label="Situação" value={buildingStatusLabel(details.status)} />
          <Info label="Síndico" value={details.syndicName || "Nenhum vinculado"} />
          <Info label="E-mail do síndico" value={details.syndicEmail || "–"} />
        </dl>

        {details.notes && (
          <div>
            <p className="text-xs text-tinta-suave">Observações</p>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-tinta">{details.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function OccupancyBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div
      role="meter"
      aria-label="Ocupação"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={`h-1.5 overflow-hidden rounded-full bg-linha ${className}`}
    >
      <div className="h-full rounded-full bg-verde transition-[width] duration-300 ease-out" style={{ width: `${value}%` }} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-tinta-suave">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-tinta">{value}</dd>
    </div>
  );
}
