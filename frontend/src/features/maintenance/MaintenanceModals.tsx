import { useState, type FormEvent } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import type { BuildingResponse } from "../buildings/types";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  INTERVAL_MAX,
  NAME_MAX,
  NOTES_MAX,
  categoryOptions,
  formatFileSize,
  intervalLabel,
  toPlanForm,
  type PlanForm,
} from "./maintenanceMeta";
import type { CreateMaintenanceRecordRequest, MaintenancePlanResponse } from "./types";

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho sm:col-span-2">
      {message}
    </p>
  );
}

type PlanFormModalProps = {
  plan: MaintenancePlanResponse | null;
  buildings: BuildingResponse[];
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (form: PlanForm) => Promise<void>;
};

export function PlanFormModal({ plan, buildings, errorMessage, isSubmitting, onClose, onSubmit }: PlanFormModalProps) {
  const [form, setForm] = useState<PlanForm>(() => toPlanForm(plan));
  const [errors, setErrors] = useState<Partial<Record<keyof PlanForm, string>>>({});
  const interval = Number(form.intervalMonths);
  const isIntervalValid = Number.isInteger(interval) && interval >= 1 && interval <= INTERVAL_MAX;

  function set<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phoneDigits = form.providerPhone.replace(/\D/g, "");
    const nextErrors = {
      name: form.name.trim() ? undefined : "Informe o nome da manutenção.",
      category: form.category ? undefined : "Escolha a categoria.",
      intervalMonths: isIntervalValid ? undefined : `Use de 1 a ${INTERVAL_MAX} meses.`,
      nextDueDate: form.nextDueDate ? undefined : "Informe a data da próxima manutenção.",
      providerPhone: phoneDigits.length === 0 || (phoneDigits.length >= 10 && phoneDigits.length <= 13) ? undefined : "Informe o telefone com DDD.",
    };

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    await onSubmit(form);
  }

  return (
    <Modal
      title={plan ? "Editar manutenção" : "Nova manutenção"}
      description="Os lembretes saem 30 e 7 dias antes da próxima data."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="maintenance-plan" isLoading={isSubmitting} loadingText="Salvando…">
            {plan ? "Salvar alterações" : "Cadastrar manutenção"}
          </Button>
        </>
      }
    >
      <form id="maintenance-plan" onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
        <FormError message={errorMessage} />

        <TextField
          label="Nome"
          className="sm:col-span-2"
          value={form.name}
          maxLength={NAME_MAX}
          onChange={(event) => set("name", event.target.value)}
          placeholder="Ex.: Limpeza da caixa d'água"
          error={errors.name}
        />
        <SelectField
          label="Categoria"
          value={form.category}
          onChange={(event) => set("category", event.target.value)}
          placeholder="Escolha"
          options={categoryOptions}
          error={errors.category}
        />
        <SelectField
          label="Onde"
          value={form.buildingId}
          onChange={(event) => set("buildingId", event.target.value)}
          options={[{ value: "", label: "Condomínio inteiro" }, ...buildings.map((building) => ({ value: String(building.id), label: building.name }))]}
        />
        <TextField
          label="Frequência (meses)"
          type="number"
          inputMode="numeric"
          min={1}
          max={INTERVAL_MAX}
          value={form.intervalMonths}
          onChange={(event) => set("intervalMonths", event.target.value)}
          hint={isIntervalValid ? `Repete: ${intervalLabel(interval)}` : undefined}
          error={errors.intervalMonths}
        />
        <TextField
          label="Próxima data"
          type="date"
          value={form.nextDueDate}
          onChange={(event) => set("nextDueDate", event.target.value)}
          error={errors.nextDueDate}
        />
        <TextField
          label="Empresa (opcional)"
          value={form.providerName}
          maxLength={NAME_MAX}
          onChange={(event) => set("providerName", event.target.value)}
          placeholder="Quem faz o serviço"
        />
        <TextField
          label="Telefone (opcional)"
          type="tel"
          inputMode="tel"
          value={form.providerPhone}
          onChange={(event) => set("providerPhone", event.target.value)}
          placeholder="(11) 98765-4321"
          error={errors.providerPhone}
        />
        <TextAreaField
          label="Observações (opcional)"
          className="sm:col-span-2"
          rows={3}
          value={form.notes}
          maxLength={NOTES_MAX}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="Ex.: pedir o laudo assinado ao fim do serviço."
        />
      </form>
    </Modal>
  );
}

type RecordFormModalProps = {
  plan: MaintenancePlanResponse;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMaintenanceRecordRequest) => Promise<void>;
};

export function RecordFormModal({ plan, errorMessage, isSubmitting, onClose, onSubmit }: RecordFormModalProps) {
  const [form, setForm] = useState<CreateMaintenanceRecordRequest>({
    performedOn: todayInputDate(),
    providerName: plan.providerName ?? "",
    notes: "",
    file: null,
  });
  const [errors, setErrors] = useState<{ performedOn?: string; file?: string }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      performedOn: !form.performedOn
        ? "Informe a data em que foi feita."
        : form.performedOn > todayInputDate()
          ? "A data não pode ser no futuro."
          : undefined,
      file: form.file && form.file.size > ATTACHMENT_MAX_BYTES ? "O anexo pode ter no máximo 20 MB." : undefined,
    };

    setErrors(nextErrors);
    if (nextErrors.performedOn || nextErrors.file) return;

    await onSubmit({ ...form, providerName: form.providerName.trim(), notes: form.notes.trim() });
  }

  return (
    <Modal
      title="Registrar execução"
      description={`${plan.name} · próxima data atual ${formatCalendarDate(plan.nextDueDate)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="maintenance-record" isLoading={isSubmitting} loadingText="Registrando…">
            Registrar
          </Button>
        </>
      }
    >
      <form id="maintenance-record" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormError message={errorMessage} />

        <TextField
          label="Feita em"
          type="date"
          max={todayInputDate()}
          value={form.performedOn}
          onChange={(event) => setForm((current) => ({ ...current, performedOn: event.target.value }))}
          hint={`A próxima data passa a ser ${plan.intervalMonths === 1 ? "1 mês" : `${plan.intervalMonths} meses`} depois deste dia (se for a execução mais recente).`}
          error={errors.performedOn}
        />
        <TextField
          label="Empresa (opcional)"
          value={form.providerName}
          maxLength={NAME_MAX}
          onChange={(event) => setForm((current) => ({ ...current, providerName: event.target.value }))}
          placeholder="Quem fez o serviço"
        />
        <TextAreaField
          label="Observações (opcional)"
          rows={3}
          value={form.notes}
          maxLength={NOTES_MAX}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Ex.: trocadas duas mangueiras do 3º andar."
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-tinta">Anexo (opcional)</span>
          {form.file ? (
            <div className="flex items-center gap-3 rounded-field bg-campo px-4 py-3">
              <Paperclip size={16} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-tinta">{form.file.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-tinta-suave">{formatFileSize(form.file.size)}</span>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, file: null }))}
                aria-label="Remover anexo"
                className="grid size-7 shrink-0 place-items-center rounded-full text-tinta-suave hover:bg-menu hover:text-tinta"
              >
                <X size={15} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 rounded-field bg-campo px-4 py-3 text-sm text-tinta-suave transition-colors hover:bg-menu has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde">
              <Paperclip size={16} strokeWidth={1.8} aria-hidden className="shrink-0" />
              <span>
                <span className="font-semibold text-tinta">Escolher arquivo</span> · laudo, nota ou foto (PDF, JPG, PNG, DOCX ou XLSX, até 20 MB)
              </span>
              <input
                type="file"
                accept={ATTACHMENT_ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setForm((current) => ({ ...current, file }));
                  event.target.value = "";
                }}
              />
            </label>
          )}
          {errors.file && <p className="text-[13px] font-medium text-vermelho">{errors.file}</p>}
        </div>
      </form>
    </Modal>
  );
}
