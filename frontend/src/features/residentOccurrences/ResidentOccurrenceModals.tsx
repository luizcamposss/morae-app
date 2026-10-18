import { useEffect, useState, type FormEvent } from "react";
import { Camera, Check, Clock, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { formatDateTime } from "../../shared/lib/date";
import { OCCURRENCE_STATUS, occurrencePriorityOptions, occurrenceTypeOptions, priorityMeta, typeLabel } from "../occurrences/occurrenceMeta";
import { PhotoThumb, StatusChip } from "../occurrences/OccurrenceParts";
import type { OccurrenceResponse } from "../occurrences/types";
import {
  DESCRIPTION_MAX,
  MAX_PHOTOS,
  PHOTO_ACCEPT,
  TITLE_MAX,
  addPhotos,
  emptyOccurrenceForm,
  validateOccurrenceForm,
  type OccurrenceForm,
  type OccurrenceFormErrors,
} from "./occurrenceForm";

export type UnitOption = { value: string; label: string };

// Local preview of a picked photo, read as a data URL (no object URL to clean up).
function PhotoPreview({ file, index, onRemove }: { file: File; index: number; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const reader = new FileReader();
    reader.onload = () => isMounted && setUrl(String(reader.result));
    reader.readAsDataURL(file);
    return () => {
      isMounted = false;
      reader.abort();
    };
  }, [file]);

  return (
    <li className="relative aspect-square overflow-hidden rounded-field bg-campo">
      {url && <img src={url} alt={`Foto ${index + 1}: ${file.name}`} className="size-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover foto ${index + 1}`}
        className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-superficie/90 text-tinta shadow-whisper transition-colors hover:bg-superficie"
      >
        <X size={14} strokeWidth={2} aria-hidden />
      </button>
    </li>
  );
}

type NewOccurrenceModalProps = {
  units: UnitOption[];
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (form: OccurrenceForm) => void;
};

export function NewOccurrenceModal({ units, errorMessage, isSubmitting, onClose, onSubmit }: NewOccurrenceModalProps) {
  const [form, setForm] = useState<OccurrenceForm>(() => emptyOccurrenceForm(units.length === 1 ? units[0].value : ""));
  const [errors, setErrors] = useState<OccurrenceFormErrors>({});

  function set<K extends keyof OccurrenceForm>(field: K, value: OccurrenceForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateOccurrenceForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(form);
  }

  return (
    <Modal
      title="Nova ocorrência"
      description="Conte o que aconteceu. A gestão recebe na hora e responde por aqui."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="new-occurrence" isLoading={isSubmitting} loadingText="Enviando…">
            Enviar
          </Button>
        </>
      }
    >
      <form id="new-occurrence" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        {units.length > 1 && (
          <SelectField
            label="Unidade"
            value={form.unitId}
            placeholder="Escolha a unidade"
            onChange={(event) => set("unitId", event.target.value)}
            options={units}
            error={errors.unitId}
          />
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-tinta">Categoria</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {occurrenceTypeOptions.map((option) => {
              const isSelected = form.type === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-field px-3 text-center text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                    isSelected ? "bg-tinta text-white" : "bg-campo text-tinta hover:bg-menu"
                  }`}
                >
                  <input type="radio" name="type" className="sr-only" checked={isSelected} onChange={() => set("type", option.value)} />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <TextField
          label="Título"
          value={form.title}
          maxLength={TITLE_MAX}
          placeholder="Ex.: Lâmpada queimada na garagem"
          onChange={(event) => set("title", event.target.value)}
          error={errors.title}
        />

        <TextAreaField
          label="O que aconteceu"
          value={form.description}
          maxLength={DESCRIPTION_MAX}
          rows={4}
          placeholder="Onde fica, desde quando e o que você já percebeu."
          onChange={(event) => set("description", event.target.value)}
          error={errors.description}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-tinta">Urgência</legend>
          <div role="group" className="grid grid-cols-4 gap-1 rounded-block bg-menu p-1">
            {occurrencePriorityOptions.map((option) => {
              const isSelected = form.priority === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => set("priority", option.value)}
                  className={`rounded-field px-2 py-2 text-sm font-semibold transition-colors ${
                    isSelected ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-sm font-semibold text-tinta">
            Fotos
            <span className="text-xs font-normal tabular-nums text-tinta-suave">
              {form.photos.length}/{MAX_PHOTOS}
            </span>
          </legend>
          <ul aria-label="Fotos escolhidas" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {form.photos.map((file, index) => (
              <PhotoPreview
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                index={index}
                onRemove={() => set("photos", form.photos.filter((_, position) => position !== index))}
              />
            ))}
            {form.photos.length < MAX_PHOTOS && (
              <li>
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-field border border-dashed border-linha bg-campo text-tinta-suave transition-colors hover:bg-menu hover:text-tinta has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde">
                  <Camera size={20} strokeWidth={1.8} aria-hidden />
                  <span className="text-xs font-semibold">Adicionar</span>
                  <input
                    type="file"
                    accept={PHOTO_ACCEPT}
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const picked = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      const result = addPhotos(form.photos, picked);
                      set("photos", result.photos);
                      if (result.error) setErrors((current) => ({ ...current, photos: result.error }));
                    }}
                  />
                </label>
              </li>
            )}
          </ul>
          <p className={`mt-2 text-[13px] ${errors.photos ? "font-medium text-vermelho" : "text-tinta-suave"}`}>
            {errors.photos ?? `Opcional. Até ${MAX_PHOTOS} fotos JPG ou PNG, de até 10 MB cada.`}
          </p>
        </fieldset>
      </form>
    </Modal>
  );
}

const trackSteps = [
  { status: OCCURRENCE_STATUS.open, label: "Aberta" },
  { status: OCCURRENCE_STATUS.inProgress, label: "Em andamento" },
  { status: OCCURRENCE_STATUS.resolved, label: "Resolvida" },
];

// Where the occurrence is in Aberta → Em andamento → Resolvida.
function StatusTrack({ occurrence }: { occurrence: OccurrenceResponse }) {
  if (occurrence.status === OCCURRENCE_STATUS.canceled) {
    return <p className="rounded-field bg-campo px-4 py-3 text-sm text-tinta-suave">A gestão cancelou esta ocorrência.</p>;
  }

  const current = trackSteps.findIndex((step) => step.status === occurrence.status);

  return (
    <ol aria-label="Andamento" className="grid grid-cols-3 gap-2">
      {trackSteps.map((step, index) => {
        const isDone = index <= current;
        return (
          <li key={step.status} aria-current={index === current ? "step" : undefined} className="flex flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${isDone ? "bg-verde" : "bg-campo"}`} />
            <span className={`text-[13px] ${index === current ? "font-semibold text-tinta" : isDone ? "text-tinta" : "text-tinta-suave"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type ResidentOccurrenceDetailsModalProps = {
  occurrence: OccurrenceResponse;
  showPlace: boolean;
  onClose: () => void;
};

export function ResidentOccurrenceDetailsModal({ occurrence, showPlace, onClose }: ResidentOccurrenceDetailsModalProps) {
  const priority = priorityMeta(occurrence.priority);
  const rows = [
    showPlace && { label: "Unidade", value: `${occurrence.buildingName} · ${occurrence.unitNumber}` },
    { label: "Aberta em", value: formatDateTime(occurrence.createdAt) },
    occurrence.resolvedAt && { label: "Resolvida em", value: formatDateTime(occurrence.resolvedAt) },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <Modal
      title={occurrence.title}
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusChip status={occurrence.status} />
          <span>{typeLabel(occurrence.type)}</span>
          <span aria-hidden>·</span>
          <span className={`font-semibold ${priority.tone}`}>Urgência {priority.label.toLowerCase()}</span>
        </span>
      }
      size="lg"
      onClose={onClose}
      footer={
        <Button variant="quiet" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <StatusTrack occurrence={occurrence} />

      <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-tinta">{occurrence.description}</p>

      {occurrence.photos.length > 0 && (
        <ul aria-label="Fotos" className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {occurrence.photos.map((photo, index) => (
            <PhotoThumb key={photo.id} photo={photo} index={index} />
          ))}
        </ul>
      )}

      <dl className="mt-5 divide-y divide-linha rounded-field bg-campo text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="shrink-0 text-tinta-suave">{row.label}</dt>
            <dd className="min-w-0 truncate text-right font-medium tabular-nums text-tinta">{row.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-tinta">Resposta da gestão</h3>
        {occurrence.managementResponse ? (
          <div className="mt-2 rounded-field bg-verde-suave px-4 py-3">
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-verde-tinta">{occurrence.managementResponse}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-verde-tinta/80">
              <Check size={14} strokeWidth={2} aria-hidden />
              {occurrence.respondedByName || "Gestão"} · {formatDateTime(occurrence.respondedAt)}
            </p>
          </div>
        ) : (
          <p className="mt-2 flex items-start gap-2 rounded-field bg-campo px-4 py-3 text-sm text-tinta-suave">
            <Clock size={16} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0" />
            Ainda sem resposta. Você recebe um aviso no sininho quando a gestão responder.
          </p>
        )}
      </section>
    </Modal>
  );
}
