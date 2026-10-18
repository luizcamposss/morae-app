import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { formatDateTime } from "../../shared/lib/date";
import type { BuildingResponse } from "../buildings/types";
import type { SaveVisitRequest, VisitResponse } from "./types";
import {
  VISIT_STATUS,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  describeSchedule,
  describeTime,
  formatVisitPlace,
  visitorTypeMeta,
  visitorTypes,
} from "./visitMeta";
import { useBuildingUnits } from "./useBuildingUnits";
import {
  COMPANY_MAX,
  NAME_MAX,
  NOTES_MAX,
  toVisitForm,
  toVisitRequest,
  validateVisitForm,
  type VisitForm,
  type VisitFormErrors,
} from "./visitForm";

export function VisitorTypeChip({ visit }: { visit: Pick<VisitResponse, "visitorType" | "status"> }) {
  if (visit.status === VISIT_STATUS.canceled) {
    return <span className="shrink-0 rounded-chip bg-vermelho-suave px-2 py-0.5 text-xs font-semibold text-vermelho">Cancelada</span>;
  }

  const meta = visitorTypeMeta(visit.visitorType);
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>{meta.chip}</span>;
}

// Icon tile of the visitor type (details header).
function VisitorTypeTile({ visit }: { visit: Pick<VisitResponse, "visitorType" | "status"> }) {
  const meta = visitorTypeMeta(visit.visitorType);
  const Icon = meta.icon;
  const tone = visit.status === VISIT_STATUS.canceled ? "bg-campo text-tinta-suave" : meta.tone;

  return (
    <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-block ${tone}`}>
      <Icon size={20} strokeWidth={1.8} />
    </span>
  );
}

// A unit the resident lives in: the only places a resident can announce a visit for.
export type OwnUnitOption = { unitId: number; buildingId: number; label: string };

type VisitFormModalProps = {
  visit: VisitResponse | null;
  // Management: any building/unit of the condominium (or the condominium itself).
  buildings?: BuildingResponse[];
  // Resident: only their own units; the "Para onde" choice shows only with more than one.
  ownUnits?: OwnUnitOption[];
  defaultDate: string;
  today: string;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: SaveVisitRequest) => Promise<void>;
};

export function VisitFormModal({ visit, buildings = [], ownUnits, defaultDate, today, errorMessage, isSubmitting, onClose, onSubmit }: VisitFormModalProps) {
  const isResident = Boolean(ownUnits);
  const [form, setForm] = useState<VisitForm>(() =>
    toVisitForm(
      visit,
      defaultDate,
      ownUnits?.length ? { buildingId: String(ownUnits[0].buildingId), unitId: String(ownUnits[0].unitId), visitorType: 1 } : {},
    ),
  );
  const [errors, setErrors] = useState<VisitFormErrors>({});
  const units = useBuildingUnits(isResident ? "" : form.buildingId);
  function set<K extends keyof VisitForm>(field: K, value: VisitForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    // A fixed field drops its old message right away (both times share one message).
    const errorKey = field === "startTime" || field === "endTime" ? "time" : field;
    setErrors((current) => (errorKey in current ? { ...current, [errorKey]: undefined } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateVisitForm(form, { isNew: !visit, today });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onSubmit(toVisitRequest(form));
  }

  function toggleDay(day: number) {
    set("daysOfWeek", form.daysOfWeek.includes(day) ? form.daysOfWeek.filter((item) => item !== day) : [...form.daysOfWeek, day]);
  }

  return (
    <Modal
      title={visit ? "Editar visita" : isResident ? "Avisar visita" : "Visita do condomínio"}
      description={
        visit
          ? `Avisada por ${visit.createdByName}.`
          : isResident
            ? "Deixe registrado quem vem e quando, para o condomínio saber."
            : "Para quem vem a serviço do condomínio ou de uma unidade."
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" form="visit-form" isLoading={isSubmitting} loadingText="Salvando…">
            {visit ? "Salvar alterações" : "Avisar visita"}
          </Button>
        </>
      }
    >
      <form id="visit-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <FormSection title="Quem vem">
          <TextField
            label="Nome"
            value={form.visitorName}
            maxLength={NAME_MAX}
            onChange={(event) => set("visitorName", event.target.value)}
            placeholder="Ex.: Dedetiza Já ou João da Silva"
            error={errors.visitorName}
          />
          <fieldset>
            <legend className="text-sm font-semibold text-tinta">Tipo</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {visitorTypes.map((option) => {
                const isSelected = form.visitorType === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col rounded-field px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                      isSelected ? "bg-verde-suave ring-2 ring-verde" : "bg-campo hover:bg-menu"
                    }`}
                  >
                    <input type="radio" name="visitorType" className="sr-only" checked={isSelected} onChange={() => set("visitorType", option.value)} />
                    <span className="text-sm font-semibold text-tinta">{option.label}</span>
                    <span className="text-xs text-tinta-suave">{option.hint}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Empresa (opcional)"
              value={form.companyName}
              maxLength={COMPANY_MAX}
              onChange={(event) => set("companyName", event.target.value)}
              placeholder="Ex.: Elétrica Silva"
            />
            <TextField
              label="Documento (opcional)"
              value={form.documentLastDigits}
              maxLength={4}
              inputMode="text"
              autoComplete="off"
              onChange={(event) => set("documentLastDigits", event.target.value.toUpperCase())}
              placeholder="4 últimos dígitos"
              hint={errors.documentLastDigits ? undefined : isResident ? "Só os 4 últimos, para conferir na entrada." : "Só os 4 últimos, para a portaria conferir."}
              error={errors.documentLastDigits}
            />
          </div>
        </FormSection>

        {isResident ? (
          ownUnits && ownUnits.length > 1 && (
            <FormSection title="Para onde">
              <SelectField
                label="Unidade"
                value={form.unitId}
                onChange={(event) => {
                  const unit = ownUnits.find((item) => String(item.unitId) === event.target.value);
                  if (unit) setForm((current) => ({ ...current, buildingId: String(unit.buildingId), unitId: String(unit.unitId) }));
                }}
                options={ownUnits.map((unit) => ({ value: String(unit.unitId), label: unit.label }))}
              />
            </FormSection>
          )
        ) : (
          <FormSection title="Para onde">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Prédio"
                value={form.buildingId}
                onChange={(event) => setForm((current) => ({ ...current, buildingId: event.target.value, unitId: "" }))}
                placeholder="Condomínio (área comum)"
                options={buildings.map((building) => ({ value: String(building.id), label: building.name }))}
              />
              <SelectField
                label="Unidade"
                value={form.unitId}
                disabled={!form.buildingId}
                onChange={(event) => set("unitId", event.target.value)}
                placeholder={form.buildingId ? "Selecione a unidade" : "Não se aplica"}
                options={units.map((unit) => ({ value: String(unit.id), label: unit.number }))}
                error={errors.unitId}
              />
            </div>
          </FormSection>
        )}

        <FormSection title="Quando">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={form.isPeriod ? "De" : "Data"}
              type="date"
              min={visit ? undefined : today}
              value={form.startDate}
              onChange={(event) => set("startDate", event.target.value)}
              error={errors.startDate}
            />
            {form.isPeriod && (
              <TextField
                label="Até"
                type="date"
                min={form.startDate || today}
                value={form.endDate}
                onChange={(event) => set("endDate", event.target.value)}
                error={errors.endDate}
              />
            )}
          </div>

          <OptionToggle
            label="Vem em mais de um dia"
            hint="Ex.: obra de duas semanas ou diarista às segundas"
            checked={form.isPeriod}
            onChange={(checked) => set("isPeriod", checked)}
          />

          {form.isPeriod && (
            <fieldset>
              <legend className="text-sm font-semibold text-tinta">Dias da semana</legend>
              <p className="text-[13px] text-tinta-suave">Nenhum marcado = todos os dias do período.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS_SHORT.map((label, day) => {
                  const isSelected = form.daysOfWeek.includes(day);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={WEEKDAYS[day]}
                      onClick={() => toggleDay(day)}
                      className={`min-w-12 rounded-full px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                        isSelected ? "bg-tinta text-white" : "bg-campo text-tinta hover:bg-menu"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <OptionToggle
            label="Tem horário marcado"
            hint="Sem horário, vale o dia todo"
            checked={form.hasTime}
            onChange={(checked) => set("hasTime", checked)}
          />

          {form.hasTime && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Chega às" type="time" value={form.startTime} onChange={(event) => set("startTime", event.target.value)} error={errors.time} />
              <TextField label="Sai até" type="time" value={form.endTime} onChange={(event) => set("endTime", event.target.value)} />
            </div>
          )}
        </FormSection>

        <TextAreaField
          label="Observações (opcional)"
          value={form.notes}
          maxLength={NOTES_MAX}
          rows={3}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="Ex.: vai usar o elevador de serviço"
        />
      </form>
    </Modal>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-display text-[17px] font-bold tracking-[-0.01em] text-tinta">{title}</h3>
      {children}
    </section>
  );
}

// Shared Switch on a soft field background, so it reads as part of the form.
function OptionToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="rounded-field bg-campo px-4">
      <Switch label={label} description={hint} checked={checked} onChange={onChange} />
    </div>
  );
}

type VisitDetailsModalProps = {
  visit: VisitResponse;
  canChange: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
};

export function VisitDetailsModal({ visit, canChange, onClose, onEdit, onCancel }: VisitDetailsModalProps) {
  const isCanceled = visit.status === VISIT_STATUS.canceled;
  const rows: Array<[string, string | null]> = [
    ["Para onde", visit.unitLabel ?? "Condomínio (área comum)"],
    ["Quando", describeSchedule(visit)],
    ["Horário", describeTime(visit)],
    ["Empresa", visit.companyName],
    ["Documento", visit.documentLastDigits ? `final ${visit.documentLastDigits}` : null],
    ["Observações", visit.notes],
    ["Avisada por", `${visit.createdByName} em ${formatDateTime(visit.createdAt)}`],
  ];

  return (
    <Modal
      title={visit.visitorName}
      description={
        <span className="flex flex-wrap items-center gap-2">
          {isCanceled && <VisitorTypeChip visit={visit} />}
          <span>
            {visitorTypeMeta(visit.visitorType).label} · {formatVisitPlace(visit)}
          </span>
        </span>
      }
      leading={<VisitorTypeTile visit={visit} />}
      onClose={onClose}
      footer={
        canChange ? (
          <>
            <button type="button" onClick={onCancel} className="mr-auto rounded-full px-3 text-sm font-semibold text-vermelho hover:underline">
              Cancelar visita
            </button>
            <Button onClick={onEdit}>Editar visita</Button>
          </>
        ) : undefined
      }
    >
      <dl className="divide-y divide-linha">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[140px_1fr] sm:gap-4">
              <dt className="text-[13px] text-tinta-suave">{label}</dt>
              <dd className="whitespace-pre-line text-[15px] font-medium tabular-nums text-tinta">{value}</dd>
            </div>
          ))}
      </dl>
      {!canChange && (
        <p className="mt-4 rounded-field bg-campo px-4 py-3 text-sm text-tinta-suave">
          {isCanceled ? "Esta visita foi cancelada e fica só no histórico." : "Esta visita já passou e não pode mais ser alterada."}
        </p>
      )}
    </Modal>
  );
}
