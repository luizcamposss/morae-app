import { useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, CircleCheck, TriangleAlert } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, formatDateTime, todayInputDate } from "../../shared/lib/date";
import type { BuildingResponse } from "../buildings/types";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeBatchResult, ChargeResponse } from "../charges/types";
import { ChargeStatusChip } from "../masterPayments/ChargeStatus";
import type { PaymentMethod } from "../payments/types";
import type { UnitResponse } from "../units/types";
import { ChargeTimeline } from "./ChargeTimeline";
import {
  amountDue,
  formatMonthKey,
  hasLateFees,
  isOpenCharge,
  nextDueDate,
  paymentMethodOptions,
  unitLabel,
  type CancelFormState,
  type GroupChargeForm,
  type ManualPaymentForm,
  type SingleChargeForm,
} from "./chargeForm";

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho sm:col-span-2">
      {message}
    </p>
  );
}

function Footer({ formId, label, loadingText, isSubmitting, onClose, danger = false }: {
  formId: string;
  label: string;
  loadingText: string;
  isSubmitting: boolean;
  onClose: () => void;
  danger?: boolean;
}) {
  return (
    <>
      <Button variant="quiet" onClick={onClose}>
        Voltar
      </Button>
      <Button type="submit" form={formId} variant={danger ? "danger" : "primary"} isLoading={isSubmitting} loadingText={loadingText}>
        {label}
      </Button>
    </>
  );
}

type FormModalProps<T> = {
  form: T;
  error: string;
  isSubmitting: boolean;
  onChange: (form: T) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SingleChargeModal({ form, units, error, isSubmitting, onChange, onClose, onSubmit }: FormModalProps<SingleChargeForm> & { units: UnitResponse[] }) {
  const set = (field: keyof SingleChargeForm, value: string) => onChange({ ...form, [field]: value });

  return (
    <Modal
      title="Cobrança avulsa"
      description="Para uma unidade só, como uma multa de regimento ou uma taxa extra."
      onClose={onClose}
      footer={<Footer formId="single-charge" label="Criar cobrança" loadingText="Criando…" isSubmitting={isSubmitting} onClose={onClose} />}
    >
      <form id="single-charge" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormError message={error} />
        <SelectField
          className="sm:col-span-2"
          label="Unidade"
          value={form.unitId}
          onChange={(event) => set("unitId", event.target.value)}
          placeholder="Escolha a unidade"
          options={units.map((unit) => ({ value: String(unit.id), label: unitLabel(unit) }))}
        />
        <TextField
          className="sm:col-span-2"
          label="Descrição"
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Ex.: Taxa extra · pintura"
          maxLength={255}
        />
        <TextField label="Valor (R$)" value={form.value} onChange={(event) => set("value", event.target.value)} placeholder="350,00" inputMode="decimal" />
        <TextField label="Vencimento" type="date" min={todayInputDate()} value={form.dueDate} onChange={(event) => set("dueDate", event.target.value)} />
      </form>
    </Modal>
  );
}

type GroupChargeModalProps = FormModalProps<GroupChargeForm> & {
  mode: "batch" | "recurring";
  buildings: BuildingResponse[];
  units: UnitResponse[];
  billingDueDay: number | null;
};

// Batch (this month, once) or recurring (every month): same value for the condominium or a building,
// with optional custom values per unit.
export function GroupChargeModal({ mode, form, buildings, units, billingDueDay, error, isSubmitting, onChange, onClose, onSubmit }: GroupChargeModalProps) {
  const [isAdjusting, setIsAdjusting] = useState(Object.keys(form.unitValues).length > 0);
  const set = (field: keyof Omit<GroupChargeForm, "unitValues">, value: string) => onChange({ ...form, [field]: value });
  const scopedUnits = form.buildingId ? units.filter((unit) => String(unit.buildingId) === form.buildingId) : units;
  const adjustedCount = scopedUnits.filter((unit) => form.unitValues[unit.id]?.trim()).length;
  const isBatch = mode === "batch";
  const formId = isBatch ? "batch-charge" : "recurring-charge";
  const dueHint = billingDueDay
    ? isBatch
      ? `Em branco: ${formatCalendarDate(nextDueDate(billingDueDay))} (dia ${billingDueDay} do condomínio).`
      : `Em branco: dia ${billingDueDay}, o do condomínio.`
    : undefined;

  return (
    <Modal
      size="lg"
      title={isBatch ? "Cobrança em lote" : "Nova recorrência"}
      description={
        isBatch
          ? "Gera uma cobrança para cada unidade de uma vez. Unidades sem ninguém vinculado ficam de fora."
          : "O Moraê gera as cobranças sozinho todo mês, 10 dias antes do vencimento, até você pausar ou encerrar."
      }
      onClose={onClose}
      footer={
        <Footer
          formId={formId}
          label={isBatch ? `Gerar para ${scopedUnits.length} ${scopedUnits.length === 1 ? "unidade" : "unidades"}` : "Criar recorrência"}
          loadingText={isBatch ? "Gerando…" : "Criando…"}
          isSubmitting={isSubmitting}
          onClose={onClose}
        />
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormError message={error} />
        <SelectField
          className="sm:col-span-2"
          label="Para quem"
          value={form.buildingId}
          onChange={(event) => set("buildingId", event.target.value)}
          options={[
            { value: "", label: `Todo o condomínio · ${units.length} unidades` },
            ...buildings.map((building) => ({ value: String(building.id), label: `${building.name} · ${building.unitCount} unidades` })),
          ]}
        />
        <TextField
          className="sm:col-span-2"
          label="Descrição"
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder={isBatch ? "Ex.: Taxa de condomínio · novembro" : "Ex.: Taxa de condomínio"}
          maxLength={255}
        />
        <TextField label="Valor por unidade (R$)" value={form.value} onChange={(event) => set("value", event.target.value)} placeholder="500,00" inputMode="decimal" />
        {isBatch ? (
          <TextField
            label="Vencimento (opcional)"
            type="date"
            min={todayInputDate()}
            value={form.dueDate}
            onChange={(event) => set("dueDate", event.target.value)}
            hint={dueHint}
          />
        ) : (
          <TextField
            label="Dia do vencimento (opcional)"
            value={form.dueDay}
            onChange={(event) => set("dueDay", event.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder={billingDueDay ? String(billingDueDay) : "10"}
            inputMode="numeric"
            hint={dueHint}
          />
        )}

        <div className="sm:col-span-2">
          <button
            type="button"
            aria-expanded={isAdjusting}
            onClick={() => setIsAdjusting(!isAdjusting)}
            className="flex w-full items-center justify-between gap-3 rounded-field bg-campo px-4 py-3 text-left text-sm font-semibold text-tinta transition-colors hover:bg-menu"
          >
            <span>
              Ajustar valor por unidade
              <span className="ml-2 font-normal text-tinta-suave">{adjustedCount ? `${adjustedCount} com valor próprio` : "opcional"}</span>
            </span>
            <ChevronDown size={18} strokeWidth={1.8} aria-hidden className={`shrink-0 transition-transform ${isAdjusting ? "rotate-180" : ""}`} />
          </button>

          {isAdjusting && (
            <div className="mt-2 rounded-block border border-linha">
              <p className="border-b border-linha px-4 py-2.5 text-[13px] text-tinta-suave">
                Deixe em branco para usar o valor padrão. Ex.: cobertura ou unidade maior.
              </p>
              {scopedUnits.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-tinta-suave">Nenhuma unidade neste prédio.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-linha overflow-y-auto">
                  {scopedUnits.map((unit) => (
                    <li key={unit.id} className="flex items-center justify-between gap-3 px-4 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-tinta">{unitLabel(unit)}</span>
                        <span className="block truncate text-xs text-tinta-suave">{unit.responsiblePersonName || "Sem responsável"}</span>
                      </span>
                      <label className="shrink-0">
                        <span className="sr-only">Valor de {unitLabel(unit)}</span>
                        <input
                          inputMode="decimal"
                          value={form.unitValues[unit.id] ?? ""}
                          onChange={(event) => onChange({ ...form, unitValues: { ...form.unitValues, [unit.id]: event.target.value } })}
                          placeholder={form.value || "padrão"}
                          className="w-28 rounded-field bg-campo px-3 py-2 text-right text-sm tabular-nums text-tinta outline-none placeholder:text-tinta-suave/70 focus:bg-superficie focus:ring-2 focus:ring-verde focus-visible:outline-none"
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// Result of a batch (or of the first month of a recurrence): what was created and who was skipped.
export function BatchResultModal({ title, result, onClose }: { title: string; result: ChargeBatchResult; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose} footer={<Button onClick={onClose}>Entendi</Button>}>
      {result.createdCount > 0 ? (
        <div className="flex items-start gap-3 rounded-block bg-verde-suave px-4 py-3">
          <CircleCheck size={20} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-verde-tinta" />
          <p className="text-sm text-verde-tinta">
            <span className="font-semibold">
              {result.createdCount} {result.createdCount === 1 ? "cobrança criada" : "cobranças criadas"}
            </span>{" "}
            · {formatCurrency(result.totalValue)} · vencimento {formatCalendarDate(result.dueDate)}
          </p>
        </div>
      ) : (
        <p className="rounded-block bg-campo px-4 py-3 text-sm text-tinta">
          Nenhuma cobrança nova para o vencimento de {formatCalendarDate(result.dueDate)}: as unidades já tinham a cobrança deste mês ou ficaram de fora.
        </p>
      )}

      {result.skipped.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-tinta">
            <TriangleAlert size={16} strokeWidth={1.8} aria-hidden className="text-ambar" />
            {result.skipped.length} {result.skipped.length === 1 ? "unidade ficou" : "unidades ficaram"} de fora
          </p>
          <ul className="mt-2 max-h-56 divide-y divide-linha overflow-y-auto rounded-block bg-campo">
            {result.skipped.map((unit) => (
              <li key={unit.unitId} className="px-4 py-2.5">
                <span className="block text-sm font-semibold text-tinta">
                  {unit.buildingName} · {unit.unitNumber}
                </span>
                <span className="block text-[13px] text-tinta-suave">{unit.reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-tinta-suave">Vincule um morador ou proprietário e crie uma cobrança avulsa para elas.</p>
        </div>
      )}
    </Modal>
  );
}

export function ManualPaymentModal({ form, charge, error, isSubmitting, onChange, onClose, onSubmit }: FormModalProps<ManualPaymentForm> & { charge?: ChargeResponse }) {
  const due = charge ? amountDue(charge) : 0;
  const canWaive = Boolean(charge && due > charge.value);

  return (
    <Modal
      title="Dar baixa"
      description={charge ? `${charge.description} · use quando o pagamento foi feito fora do app.` : undefined}
      onClose={onClose}
      footer={<Footer formId="manual-payment" label="Registrar pagamento" loadingText="Registrando…" isSubmitting={isSubmitting} onClose={onClose} />}
    >
      <form id="manual-payment" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormError message={error} />
        <TextField
          label="Valor pago (R$)"
          value={form.amountPaid}
          onChange={(event) => onChange({ ...form, amountPaid: event.target.value })}
          inputMode="decimal"
          hint={charge && canWaive ? `De ${formatCurrency(charge.value)} (sem multa e juros) até ${formatCurrency(due)}.` : undefined}
        />
        <TextField label="Data do pagamento" type="date" max={todayInputDate()} value={form.paidAt} onChange={(event) => onChange({ ...form, paidAt: event.target.value })} />
        <SelectField
          className="sm:col-span-2"
          label="Forma de pagamento"
          value={String(form.paymentMethod)}
          onChange={(event) => onChange({ ...form, paymentMethod: Number(event.target.value) as PaymentMethod })}
          options={paymentMethodOptions.map((option) => ({ value: String(option.value), label: option.label }))}
        />
        <TextField
          className="sm:col-span-2"
          label="Observação (opcional)"
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          maxLength={255}
          placeholder="Ex.: Pix recebido direto na conta"
        />
      </form>
    </Modal>
  );
}

export function CancelChargeModal({ form, error, isSubmitting, onChange, onClose, onSubmit }: FormModalProps<CancelFormState>) {
  return (
    <Modal
      title="Cancelar cobrança?"
      description="Ela sai das cobranças em aberto da unidade. O motivo fica registrado."
      onClose={onClose}
      footer={<Footer formId="cancel-charge" label="Cancelar cobrança" loadingText="Cancelando…" isSubmitting={isSubmitting} onClose={onClose} danger />}
    >
      <form id="cancel-charge" onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormError message={error} />
        <TextField label="Motivo" value={form.reason} onChange={(event) => onChange({ ...form, reason: event.target.value })} maxLength={255} placeholder="Ex.: lançada em duplicidade" />
      </form>
    </Modal>
  );
}

function AmountRow({ label, detail, value, strong = false, tone = "text-tinta" }: { label: string; detail?: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 px-4 py-2.5 ${strong ? "border-t border-linha" : ""}`}>
      <dt className={`text-sm ${strong ? "font-semibold text-tinta" : "text-tinta-suave"}`}>
        {label}
        {detail && <span className="ml-1.5 text-xs text-tinta-suave">{detail}</span>}
      </dt>
      <dd className={`tabular-nums ${strong ? "font-display text-lg font-bold" : "text-sm font-semibold"} ${tone}`}>{value}</dd>
    </div>
  );
}

type ChargeDetailsModalProps = {
  charge: ChargeResponse;
  place: string;
  person?: string;
  footer?: ReactNode;
  // Extra block under the amounts (e.g. the platform Pix key).
  extra?: ReactNode;
  // Management view: full history (reminders, receipts, payment) instead of the creation line.
  showTimeline?: boolean;
  onClose: () => void;
};

// Original value + fine + interest = updated amount, plus where the charge came from.
export function ChargeDetailsModal({ charge, place, person, footer, extra, showTimeline = false, onClose }: ChargeDetailsModalProps) {
  const isOpen = isOpenCharge(charge);
  const isOverdue = charge.status === CHARGE_STATUS.overdue;
  const hasRule = charge.finePercent != null || charge.monthlyInterestPercent != null;

  return (
    <Modal
      title={charge.description}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <ChargeStatusChip status={charge.status} />
          {place}
          {person ? ` · ${person}` : ""}
        </span>
      }
      onClose={onClose}
      footer={footer}
    >
      <dl className="rounded-block bg-campo py-1">
        <AmountRow label="Valor original" value={formatCurrency(charge.value)} />
        {isOpen && hasLateFees(charge) && (
          <>
            <AmountRow label="Multa" detail={charge.finePercent != null ? `${charge.finePercent}%` : undefined} value={`+ ${formatCurrency(charge.fineAmount)}`} tone="text-vermelho" />
            <AmountRow
              label="Juros"
              detail={`${charge.monthlyInterestPercent ?? 0}% ao mês · ${charge.daysLate} ${charge.daysLate === 1 ? "dia" : "dias"}`}
              value={`+ ${formatCurrency(charge.interestAmount)}`}
              tone="text-vermelho"
            />
          </>
        )}
        {isOpen && <AmountRow strong label={hasLateFees(charge) ? "Valor atualizado hoje" : "Valor a pagar"} value={formatCurrency(amountDue(charge))} tone={isOverdue ? "text-vermelho" : "text-tinta"} />}
      </dl>

      {extra}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-tinta-suave">Vencimento</dt>
          <dd className={`font-semibold tabular-nums ${isOverdue ? "text-vermelho" : "text-tinta"}`}>
            {formatCalendarDate(charge.dueDate)}
            {isOverdue && charge.daysLate > 0 && <span className="font-normal"> · {charge.daysLate} {charge.daysLate === 1 ? "dia" : "dias"} de atraso</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-tinta-suave">Origem</dt>
          <dd className="font-semibold text-tinta">
            {charge.recurringChargeId ? `Recorrência${charge.referenceMonth ? ` · ${formatMonthKey(charge.referenceMonth.slice(0, 7))}` : ""}` : "Lançada pela gestão"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-tinta-suave">Multa e juros</dt>
          <dd className="text-tinta">
            {hasRule
              ? `Multa de ${charge.finePercent ?? 0}% e juros de ${charge.monthlyInterestPercent ?? 0}% ao mês se pagar depois do vencimento.`
              : "Sem multa e juros (criada antes da regra ou com a regra desligada)."}
          </dd>
        </div>
      </dl>

      {showTimeline ? (
        <ChargeTimeline charge={charge} />
      ) : (
        <>
          <p className="mt-4 text-[13px] text-tinta-suave">Criada em {formatDateTime(charge.createdAt)}</p>
          {charge.cancelReason && (
            <p className="mt-2 rounded-field bg-campo px-4 py-3 text-sm text-tinta">
              <span className="font-semibold">Motivo do cancelamento:</span> {charge.cancelReason}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
