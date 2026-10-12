import type { FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, formatDateTime, todayInputDate } from "../../shared/lib/date";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import type { CondominiumResponse } from "../condominiums/types";
import { PaymentReceiptButton } from "../payments/PaymentReceiptButton";
import type { PaymentMethod } from "../payments/types";
import {
  paymentMethodOptions,
  type CancelFormState,
  type CreateFormState,
  type PaymentFormState,
} from "./platformChargeForm";
import { ChargeStatusChip } from "./ChargeStatus";

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

type NewChargeModalProps = {
  form: CreateFormState;
  condominiums: CondominiumResponse[];
  error: string;
  isSubmitting: boolean;
  onChange: (form: CreateFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function NewChargeModal({ form, condominiums, error, isSubmitting, onChange, onClose, onSubmit }: NewChargeModalProps) {
  const set = (field: keyof CreateFormState, value: string) => onChange({ ...form, [field]: value });

  return (
    <Modal
      title="Nova mensalidade"
      description="O condomínio vê a cobrança em Ajustes → Plano e pagamento."
      onClose={onClose}
      footer={<Footer formId="new-charge" label="Criar mensalidade" loadingText="Criando…" isSubmitting={isSubmitting} onClose={onClose} />}
    >
      <form id="new-charge" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormError message={error} />
        <SelectField
          className="sm:col-span-2"
          label="Condomínio"
          value={form.condominiumId}
          onChange={(event) => set("condominiumId", event.target.value)}
          placeholder="Selecione o condomínio"
          options={condominiums.map((condominium) => ({ value: String(condominium.id), label: condominium.name }))}
        />
        <TextField
          className="sm:col-span-2"
          label="Descrição"
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Mensalidade Moraê · Novembro"
          maxLength={255}
        />
        <TextField label="Valor (R$)" value={form.value} onChange={(event) => set("value", event.target.value)} placeholder="290,00" inputMode="decimal" />
        <TextField label="Vencimento" type="date" min={todayInputDate()} value={form.dueDate} onChange={(event) => set("dueDate", event.target.value)} />
      </form>
    </Modal>
  );
}

type ManualPaymentModalProps = {
  form: PaymentFormState;
  charge?: ChargeResponse;
  error: string;
  isSubmitting: boolean;
  onChange: (form: PaymentFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ManualPaymentModal({ form, charge, error, isSubmitting, onChange, onClose, onSubmit }: ManualPaymentModalProps) {
  return (
    <Modal
      title="Dar baixa"
      description={charge ? `${charge.condominiumName} · ${formatCurrency(charge.value)}. Use quando o pagamento foi feito fora do app.` : undefined}
      onClose={onClose}
      footer={<Footer formId="manual-payment" label="Registrar pagamento" loadingText="Registrando…" isSubmitting={isSubmitting} onClose={onClose} />}
    >
      <form id="manual-payment" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormError message={error} />
        <TextField label="Valor pago (R$)" value={form.amountPaid} onChange={(event) => onChange({ ...form, amountPaid: event.target.value })} inputMode="decimal" />
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

type CancelChargeModalProps = {
  form: CancelFormState;
  error: string;
  isSubmitting: boolean;
  onChange: (form: CancelFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CancelChargeModal({ form, error, isSubmitting, onChange, onClose, onSubmit }: CancelChargeModalProps) {
  return (
    <Modal
      title="Cancelar mensalidade?"
      description="Ela sai das cobranças em aberto do condomínio. O motivo fica registrado."
      onClose={onClose}
      footer={<Footer formId="cancel-charge" label="Cancelar mensalidade" loadingText="Cancelando…" isSubmitting={isSubmitting} onClose={onClose} danger />}
    >
      <form id="cancel-charge" onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormError message={error} />
        <TextField label="Motivo" value={form.reason} onChange={(event) => onChange({ ...form, reason: event.target.value })} maxLength={255} placeholder="Ex.: valor lançado errado" />
      </form>
    </Modal>
  );
}

type ChargeDetailsModalProps = {
  charge: ChargeResponse;
  onClose: () => void;
  onPay: () => void;
  onCancel: () => void;
  onRefunded: () => void;
};

export function ChargeDetailsModal({ charge, onClose, onPay, onCancel, onRefunded }: ChargeDetailsModalProps) {
  const isOpen = charge.status === CHARGE_STATUS.pending || charge.status === CHARGE_STATUS.overdue;
  const isPaid = charge.status === CHARGE_STATUS.paid;

  return (
    <Modal
      title={charge.description}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <ChargeStatusChip status={charge.status} />
          {charge.condominiumName}
        </span>
      }
      onClose={onClose}
      footer={
        isOpen || isPaid ? (
          <>
            {isOpen && (
              <button type="button" onClick={onCancel} className="mr-auto rounded-full px-2 text-sm font-semibold text-vermelho hover:underline">
                Cancelar mensalidade
              </button>
            )}
            {isPaid && <PaymentReceiptButton chargeId={charge.id} onRefunded={onRefunded} />}
            {isOpen && <Button onClick={onPay}>Dar baixa</Button>}
          </>
        ) : undefined
      }
    >
      <dl className="grid grid-cols-2 divide-x divide-linha rounded-block bg-campo">
        <div className="px-4 py-3">
          <dt className="text-xs text-tinta-suave">Valor</dt>
          <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-tinta">{formatCurrency(charge.value)}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-tinta-suave">Vencimento</dt>
          <dd className={`mt-0.5 font-display text-lg font-bold tabular-nums ${charge.status === CHARGE_STATUS.overdue ? "text-vermelho" : "text-tinta"}`}>
            {formatCalendarDate(charge.dueDate)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-[13px] text-tinta-suave">Criada em {formatDateTime(charge.createdAt)}</p>
      {charge.cancelReason && (
        <p className="mt-2 rounded-field bg-campo px-4 py-3 text-sm text-tinta">
          <span className="font-semibold">Motivo do cancelamento:</span> {charge.cancelReason}
        </p>
      )}
    </Modal>
  );
}
