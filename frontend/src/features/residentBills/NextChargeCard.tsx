import { categoryLabel } from "../charges/chargeCategories";
import { CircleCheck, QrCode } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate } from "../../shared/lib/date";
import { amountDue, hasLateFees } from "../adminPayments/chargeForm";
import { PaymentProofChip } from "../charges/PaymentProofChip";
import { proofState } from "../charges/paymentProof";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import { billPlace, describeDue } from "./residentBills";

type NextChargeCardProps = {
  charge?: ChargeResponse;
  isLoading: boolean;
  // How many other open charges there are besides this one.
  otherOpenCount?: number;
  onPay: (charge: ChargeResponse) => void;
  onDetails?: (charge: ChargeResponse) => void;
};

// The charge to pay first, with the updated amount and the pay button (Boletos and Início).
export function NextChargeCard({ charge, isLoading, otherOpenCount = 0, onPay, onDetails }: NextChargeCardProps) {
  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-card bg-superficie shadow-whisper" aria-label="Carregando cobrança" />;
  }

  if (!charge) {
    return (
      <section className="flex items-center gap-4 rounded-card bg-superficie px-6 py-6 shadow-whisper">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-field bg-verde-suave text-verde-tinta">
          <CircleCheck size={20} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-display text-[19px] font-bold text-tinta">Tudo em dia</h2>
          <p className="mt-0.5 text-sm text-tinta-suave">Nenhuma cobrança em aberto. Quando chegar uma, ela aparece aqui.</p>
        </div>
      </section>
    );
  }

  const isOverdue = charge.status === CHARGE_STATUS.overdue;
  const showFees = hasLateFees(charge);

  return (
    <section aria-label="Cobrança em aberto" className="rounded-card bg-superficie p-6 shadow-whisper">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[13px] font-semibold ${isOverdue ? "text-vermelho" : "text-tinta-suave"}`}>
            {isOverdue ? "Cobrança atrasada" : "Próxima cobrança"}
          </p>
          <h2 className="mt-1 truncate text-[15px] font-semibold text-tinta">{charge.description}</h2>
          <p className="truncate text-[13px] text-tinta-suave">
            {categoryLabel(charge.category)} · {billPlace(charge)}
          </p>
        </div>
        {otherOpenCount > 0 && (
          <span className="shrink-0 rounded-chip bg-campo px-2 py-0.5 text-xs font-semibold text-tinta-suave">+{otherOpenCount} em aberto</span>
        )}
      </div>

      <p className={`mt-4 font-display text-[36px] font-bold leading-none tracking-[-0.015em] tabular-nums ${isOverdue ? "text-vermelho" : "text-tinta"}`}>
        {formatCurrency(amountDue(charge))}
      </p>
      <p className={`mt-2 text-[13px] ${isOverdue ? "text-vermelho" : "text-tinta-suave"}`}>{describeDue(charge, formatCalendarDate(charge.dueDate))}</p>

      {showFees && (
        <p className="mt-1 text-[13px] tabular-nums text-tinta-suave">
          {formatCurrency(charge.value)} + multa {formatCurrency(charge.fineAmount)} + juros {formatCurrency(charge.interestAmount)}
        </p>
      )}

      {proofState(charge) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-tinta-suave">
          <PaymentProofChip charge={charge} />
          {proofState(charge) === "sent" ? "A gestão vai conferir e dar baixa." : charge.latestProofRejectionReason}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button variant="accent" onClick={() => onPay(charge)} className="sm:px-7">
          <QrCode size={18} strokeWidth={1.8} aria-hidden />
          {charge.onlinePaymentAvailable ? "Pagar com Pix ou cartão" : "Pagar com Pix"}
        </Button>
        {onDetails && (
          <Button variant="quiet" onClick={() => onDetails(charge)}>
            Ver detalhes
          </Button>
        )}
      </div>
    </section>
  );
}
