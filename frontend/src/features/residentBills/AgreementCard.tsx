import { Handshake } from "lucide-react";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate } from "../../shared/lib/date";
import { installmentLabel, nextInstallment } from "../agreements/agreementMeta";
import type { AgreementResponse } from "../agreements/types";
import { AgreementInstallmentList, AgreementProgress } from "../adminPayments/AgreementsList";

// "Seu acordo": the resident's active debt agreement, its progress and installments.
// The installments themselves are paid in the list of Boletos, like any charge.
export function AgreementCard({ agreement }: { agreement: AgreementResponse }) {
  const next = nextInstallment(agreement);

  return (
    <section aria-labelledby={`agreement-${agreement.id}`} className="mt-6 rounded-card bg-superficie p-5 shadow-whisper sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-field bg-menu text-tinta">
          <Handshake size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`agreement-${agreement.id}`} className="text-[15px] font-semibold text-tinta">
            Seu acordo
          </h2>
          <p className="text-[13px] text-tinta-suave">
            {agreement.buildingName} · {agreement.unitNumber} · {formatCurrency(agreement.totalAmount)}
            {agreement.discountAmount > 0 ? ` (com ${formatCurrency(agreement.discountAmount)} de desconto)` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <AgreementProgress agreement={agreement} />
      </div>

      {next && (
        <p className="mt-4 rounded-block bg-campo px-4 py-3 text-[13px] text-tinta">
          Próxima: <span className="font-semibold">{installmentLabel(next, agreement.installmentCount)}</span> de{" "}
          <span className="font-semibold tabular-nums">{formatCurrency(next.updatedAmount)}</span>, {next.daysLate > 0 ? "venceu" : "vence"} {formatCalendarDate(next.dueDate)}. Pague na lista abaixo.
        </p>
      )}

      <details className="group mt-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-verde-tinta hover:underline">
          <span className="group-open:hidden">Ver as {agreement.totalCount} parcelas</span>
          <span className="hidden group-open:inline">Esconder parcelas</span>
        </summary>
        <div className="mt-3">
          <AgreementInstallmentList agreement={agreement} />
          <p className="mt-2 text-xs text-tinta-suave">
            Se uma parcela passar de {agreement.breakAfterDaysLate} dias de atraso, o acordo é quebrado e as cobranças originais voltam, com multa e juros.
          </p>
        </div>
      </details>
    </section>
  );
}
