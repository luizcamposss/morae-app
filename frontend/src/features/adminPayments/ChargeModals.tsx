import { type FormEvent, type ReactNode } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, formatDateTime, todayInputDate } from "../../shared/lib/date";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeBatchResult, ChargeResponse } from "../charges/types";
import { ChargeStatusChip } from "../masterPayments/ChargeStatus";
import { ChargeCategoryChip } from "../charges/ChargeCategoryChip";
import type { PaymentMethod } from "../payments/types";
import { ChargeTimeline } from "./ChargeTimeline";
import {
  amountDue,
  formatMonthKey,
  hasLateFees,
  isOpenCharge,
  paymentMethodOptions,
  type CancelFormState,
  type ManualPaymentForm,
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
          <p className="mt-2 text-[13px] text-tinta-suave">Resolva o vínculo da unidade e use “Nova cobrança” para cobrar essas unidades.</p>
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
          {charge.scope === 2 && <ChargeCategoryChip category={charge.category} />}
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
