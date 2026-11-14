import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Plus, Trash2, Trees } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { TextField } from "../../shared/components/TextField";
import type { BuildingResponse } from "../buildings/types";
import { reservationStatusMeta, toAreaForm, toAreaRequest, type AreaForm } from "./reservationMeta";
import { getCommonAreaPhoto } from "./reservationService";
import type { CommonAreaResponse, ReservationStatus, SaveCommonAreaRequest } from "./types";

export function ReservationStatusChip({ status }: { status: ReservationStatus }) {
  const meta = reservationStatusMeta(status);
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>;
}

// The photo needs the token, so it is fetched as a Blob; without one, a calm placeholder.
export function AreaPhoto({ area, className = "" }: { area: Pick<CommonAreaResponse, "id" | "hasPhoto" | "name">; className?: string }) {
  const [state, setState] = useState<{ key: string; url: string | null }>({ key: "", url: null });
  const key = `${area.id}|${area.hasPhoto}`;

  useEffect(() => {
    if (!area.hasPhoto) return;
    let isMounted = true;
    let objectUrl: string | null = null;

    getCommonAreaPhoto(area.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (isMounted) setState({ key, url: objectUrl });
      })
      .catch(() => isMounted && setState({ key, url: null }));

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [area.id, area.hasPhoto, key]);

  const url = area.hasPhoto && state.key === key ? state.url : null;

  return (
    <span className={`relative block overflow-hidden bg-campo ${className}`}>
      {url ? (
        <img src={url} alt={`Foto de ${area.name}`} className="size-full object-cover" />
      ) : (
        <span aria-hidden className="grid size-full place-items-center text-tinta-suave">
          <Trees size={26} strokeWidth={1.6} />
        </span>
      )}
    </span>
  );
}

type AreaFormModalProps = {
  area: CommonAreaResponse | null;
  buildings: BuildingResponse[];
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: SaveCommonAreaRequest, photo: File | null, removePhoto: boolean) => void;
};

export function AreaFormModal({ area, buildings, errorMessage, isSubmitting, onClose, onSubmit }: AreaFormModalProps) {
  const [form, setForm] = useState<AreaForm>(() => toAreaForm(area));
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const hasFee = form.fee.trim() !== "" && form.fee.trim() !== "0";

  function update(changes: Partial<AreaForm>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  function updateShift(index: number, changes: Partial<AreaForm["shifts"][number]>) {
    update({ shifts: form.shifts.map((shift, position) => (position === index ? { ...shift, ...changes } : shift)) });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(toAreaRequest(form), photo, removePhoto);
  }

  return (
    <Modal
      title={area ? "Editar área" : "Nova área comum"}
      description="Defina como os moradores reservam. Dá para mudar depois."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="area-form" isLoading={isSubmitting} loadingText="Salvando…">
            {area ? "Salvar" : "Criar área"}
          </Button>
        </>
      }
    >
      <form id="area-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
          <TextField label="Nome" required maxLength={100} placeholder="Salão de festas" value={form.name} onChange={(event) => update({ name: event.target.value })} />
          <TextField label="Capacidade" inputMode="numeric" placeholder="Pessoas" value={form.capacity} onChange={(event) => update({ capacity: event.target.value.replace(/\D/g, "") })} />
          <TextAreaField
            label="Descrição"
            className="sm:col-span-2"
            rows={2}
            maxLength={1000}
            placeholder="O que tem no espaço (churrasqueira, mesas, cozinha…)"
            value={form.description}
            onChange={(event) => update({ description: event.target.value })}
          />
          {buildings.length > 1 && (
            <SelectField
              label="Quem pode reservar"
              className="sm:col-span-2"
              value={form.buildingId}
              onChange={(event) => update({ buildingId: event.target.value })}
              options={[{ value: "", label: "Todo o condomínio" }, ...buildings.map((building) => ({ value: String(building.id), label: `Só ${building.name}` }))]}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-tinta">Como se reserva</h3>
          <div role="radiogroup" aria-label="Como se reserva" className="flex w-full rounded-block bg-menu p-1 sm:w-auto sm:self-start">
            {[
              { value: false, label: "Por turnos" },
              { value: true, label: "Dia inteiro" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={form.fullDay === option.value}
                onClick={() => update({ fullDay: option.value })}
                className={`flex-1 rounded-field px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                  form.fullDay === option.value ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {!form.fullDay && (
            <div className="flex flex-col gap-2">
              {form.shifts.map((shift, index) => (
                <div key={shift.id ?? `new-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
                  <TextField
                    label="Turno"
                    maxLength={60}
                    value={shift.name}
                    onChange={(event) => updateShift(index, { name: event.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => update({ shifts: form.shifts.filter((_, position) => position !== index) })}
                    aria-label={`Remover o turno ${shift.name || index + 1}`}
                    className="mb-1.5 grid size-10 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho sm:order-last"
                  >
                    <Trash2 size={17} strokeWidth={1.8} aria-hidden />
                  </button>
                  <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-2">
                    <TextField label="Início" type="time" value={shift.startTime} onChange={(event) => updateShift(index, { startTime: event.target.value })} />
                    <TextField label="Fim" type="time" value={shift.endTime} onChange={(event) => updateShift(index, { endTime: event.target.value })} />
                  </div>
                </div>
              ))}
              {form.shifts.length < 6 && (
                <button
                  type="button"
                  onClick={() => update({ shifts: [...form.shifts, { name: "", startTime: "", endTime: "" }] })}
                  className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-2 text-sm font-semibold text-tinta transition-colors hover:bg-campo"
                >
                  <Plus size={16} strokeWidth={2} aria-hidden />
                  Adicionar turno
                </button>
              )}
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Antecedência mínima"
            hint="dias antes"
            inputMode="numeric"
            value={form.minAdvanceDays}
            onChange={(event) => update({ minAdvanceDays: event.target.value.replace(/\D/g, "") })}
          />
          <TextField
            label="Antecedência máxima"
            hint="dias antes"
            inputMode="numeric"
            value={form.maxAdvanceDays}
            onChange={(event) => update({ maxAdvanceDays: event.target.value.replace(/\D/g, "") })}
          />
          <TextField
            label="Limite por unidade"
            hint="reservas por mês (vazio = sem limite)"
            inputMode="numeric"
            value={form.monthlyLimitPerUnit}
            onChange={(event) => update({ monthlyLimitPerUnit: event.target.value.replace(/\D/g, "") })}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Taxa da reserva (R$)"
            hint="vira cobrança da unidade ao aprovar (vazio = grátis)"
            inputMode="decimal"
            placeholder="0,00"
            value={form.fee}
            onChange={(event) => update({ fee: event.target.value.replace(/[^\d,.]/g, "") })}
          />
          {hasFee && (
            <TextField
              label="Cancelar sem custo até"
              hint="dias antes da data (vazio = sempre)"
              inputMode="numeric"
              value={form.freeCancellationDays}
              onChange={(event) => update({ freeCancellationDays: event.target.value.replace(/\D/g, "") })}
            />
          )}
        </section>

        <div className="divide-y divide-linha rounded-block bg-campo/60 px-4">
          <Switch
            label="Precisa de aprovação"
            description={form.requiresApproval ? "A gestão aprova ou recusa cada pedido." : "A reserva é confirmada na hora."}
            checked={form.requiresApproval}
            onChange={(checked) => update({ requiresApproval: checked })}
          />
          {area && (
            <Switch
              label="Área ativa"
              description={form.isActive ? "Aparece para os moradores." : "Fica escondida e não recebe pedidos novos."}
              checked={form.isActive}
              onChange={(checked) => update({ isActive: checked })}
            />
          )}
        </div>

        <TextAreaField
          label="Termos de uso"
          hint="O morador precisa aceitar antes de reservar (vazio = sem termos)."
          rows={4}
          maxLength={4000}
          placeholder="Horário do som, limpeza, número de convidados…"
          value={form.terms}
          onChange={(event) => update({ terms: event.target.value })}
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-campo px-4 py-2 text-sm font-semibold text-tinta transition-colors hover:bg-menu">
            <ImagePlus size={16} strokeWidth={1.8} aria-hidden />
            {photo ? photo.name : area?.hasPhoto && !removePhoto ? "Trocar foto" : "Adicionar foto"}
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(event) => {
                setPhoto(event.target.files?.[0] ?? null);
                setRemovePhoto(false);
              }}
            />
          </label>
          {area?.hasPhoto && !photo && (
            <button
              type="button"
              aria-pressed={removePhoto}
              onClick={() => setRemovePhoto(!removePhoto)}
              className="rounded-full px-3 py-2 text-sm font-semibold text-tinta-suave hover:text-vermelho"
            >
              {removePhoto ? "A foto será removida (desfazer)" : "Remover foto"}
            </button>
          )}
          <span className="text-xs text-tinta-suave">JPG ou PNG, até 10 MB.</span>
        </div>
      </form>
    </Modal>
  );
}

type ReasonModalProps = {
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  required: boolean;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

// Reject (reason required) or cancel (reason optional) a reservation.
export function ReasonModal({ title, description, label, confirmLabel, required, errorMessage, isSubmitting, onClose, onSubmit }: ReasonModalProps) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={isSubmitting}>
            Voltar
          </Button>
          <Button variant="danger" isLoading={isSubmitting} disabled={required && reason.trim().length < 3} onClick={() => onSubmit(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {errorMessage && (
        <p role="alert" className="mb-4 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}
      <TextAreaField label={label} rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
    </Modal>
  );
}
