import { formatCurrency } from "../../shared/lib/currency";
import { formatDate, formatDateTime, formatTime, toAppDateString } from "../../shared/lib/date";
import { PAYMENT_PROOF_STATUS } from "../charges/paymentProof";
import type { ChargeResponse, PaymentProof } from "../charges/types";
import { paymentMethodLabels, type PaymentResponse } from "../payments/types";

export type TimelineEvent = {
  key: string;
  kind: "created" | "reminder" | "proof" | "rejected" | "paid" | "canceled";
  title: string;
  detail?: string;
  at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days between two "YYYY-MM-DD" calendar dates.
function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY_MS);
}

// Manual payments with a past day are stored at midnight (São Paulo): show only the date then.
export function formatEventTime(value: string) {
  return formatTime(value) === "00:00" ? formatDate(value) : formatDateTime(value);
}

// Everything that happened to a charge, oldest first: creation, the reminders the job e-mailed,
// Pix receipts sent/rejected, the payment and the cancellation.
export function buildChargeTimeline(charge: ChargeResponse, proofs: PaymentProof[], payments: PaymentResponse[]): TimelineEvent[] {
  const events: TimelineEvent[] = [{ key: "created", kind: "created", title: "Cobrança criada", at: charge.createdAt }];

  if (charge.dueSoonReminderSentAt) {
    const daysLeft = daysBetween(toAppDateString(charge.dueSoonReminderSentAt), charge.dueDate);
    events.push({
      key: "due-soon",
      kind: "reminder",
      title: "Lembrete de vencimento enviado",
      detail: daysLeft > 1 ? `vence em ${daysLeft} dias` : daysLeft === 1 ? "vence amanhã" : "vence hoje",
      at: charge.dueSoonReminderSentAt,
    });
  }

  if (charge.overdueReminderSentAt) {
    events.push({ key: "overdue", kind: "reminder", title: "Lembrete de atraso enviado", detail: "por e-mail", at: charge.overdueReminderSentAt });
  }

  for (const proof of proofs) {
    events.push({ key: `proof-${proof.id}`, kind: "proof", title: "Comprovante de Pix enviado", detail: `por ${proof.uploadedByName}`, at: proof.createdAt });
    if (proof.status === PAYMENT_PROOF_STATUS.rejected && proof.reviewedAt) {
      events.push({
        key: `proof-${proof.id}-rejected`,
        kind: "rejected",
        title: "Comprovante recusado",
        detail: [proof.rejectionReason, proof.reviewedByName].filter(Boolean).join(" · "),
        at: proof.reviewedAt,
      });
    }
  }

  // The latest payment is the one that settled the charge (earlier ones were refunded).
  const payment = payments.reduce<PaymentResponse | null>((latest, item) => (!latest || item.paidAt > latest.paidAt ? item : latest), null);
  if (payment) {
    events.push({
      key: `payment-${payment.id}`,
      kind: "paid",
      title: "Pagamento registrado",
      detail: `${formatCurrency(payment.amountPaid)} · ${paymentMethodLabels[payment.paymentMethod]}`,
      at: payment.paidAt,
    });
  }

  if (charge.canceledAt) {
    events.push({ key: "canceled", kind: "canceled", title: "Cobrança cancelada", detail: charge.cancelReason ?? undefined, at: charge.canceledAt });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
