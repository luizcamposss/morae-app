import { ChevronRight, Handshake } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, formatDate } from "../../shared/lib/date";
import { AGREEMENT_STATUS, agreementStatuses, installmentLabel, nextInstallment, progressPercent } from "../agreements/agreementMeta";
import type { AgreementResponse, AgreementStatus } from "../agreements/types";
import { ChargeStatusChip } from "../masterPayments/ChargeStatus";

export function AgreementStatusChip({ status }: { status: AgreementStatus }) {
  const { label, tone } = agreementStatuses[status];
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

export function AgreementProgress({ agreement }: { agreement: AgreementResponse }) {
  return (
    <span className="block">
      <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-linha">
        <span className="block h-full rounded-full bg-verde" style={{ width: `${progressPercent(agreement)}%` }} />
      </span>
      <span className="mt-1 block text-xs tabular-nums text-tinta-suave">
        {agreement.paidCount} de {agreement.totalCount} pagas · {formatCurrency(agreement.paidAmount)} de {formatCurrency(agreement.totalAmount)}
      </span>
    </span>
  );
}

// Installments with status, due date and value (shared by the management and the resident).
export function AgreementInstallmentList({ agreement }: { agreement: AgreementResponse }) {
  return (
    <ol className="divide-y divide-linha overflow-hidden rounded-block border border-linha">
      {agreement.installments.map((item) => (
        <li key={item.chargeId} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-tinta">{installmentLabel(item, agreement.installmentCount)}</span>
            <span className="block text-xs text-tinta-suave">
              {formatCalendarDate(item.dueDate)}
              {item.daysLate > 0 ? ` · ${item.daysLate} ${item.daysLate === 1 ? "dia" : "dias"} de atraso` : ""}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-semibold tabular-nums text-tinta">{formatCurrency(item.updatedAmount)}</span>
            <ChargeStatusChip status={item.status} />
          </span>
        </li>
      ))}
    </ol>
  );
}

type AgreementsListProps = {
  items: AgreementResponse[];
  isLoading: boolean;
  onSelect: (agreement: AgreementResponse) => void;
};

export function AgreementsList({ items, isLoading, onSelect }: AgreementsListProps) {
  const sorted = [...items].sort((a, b) => Number(b.status === AGREEMENT_STATUS.active) - Number(a.status === AGREEMENT_STATUS.active) || b.createdAt.localeCompare(a.createdAt));

  return (
    <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
      {sorted.length === 0 ? (
        <li className="px-5 py-10 text-center text-sm text-tinta-suave">
          {isLoading ? "Carregando…" : "Nenhum acordo ainda. Abra uma cobrança atrasada ou use “Fazer acordo” para parcelar a dívida de uma unidade."}
        </li>
      ) : (
        sorted.map((agreement) => {
          const next = agreement.status === AGREEMENT_STATUS.active ? nextInstallment(agreement) : undefined;
          return (
            <li key={agreement.id}>
              <button type="button" onClick={() => onSelect(agreement)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-campo/60">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-field bg-menu text-tinta">
                  <Handshake size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-tinta">
                      {agreement.buildingName} · {agreement.unitNumber}
                    </span>
                    <AgreementStatusChip status={agreement.status} />
                  </span>
                  <span className="block truncate text-[13px] text-tinta-suave">
                    {agreement.downPayment ? "entrada + " : ""}
                    {agreement.installmentCount}x · feito em {formatDate(agreement.createdAt)}
                    {agreement.recipientName ? ` · só ${agreement.recipientName}` : ""}
                    {next ? ` · próxima ${formatCalendarDate(next.dueDate)}` : ""}
                  </span>
                  <span className="mt-2 block max-w-xs">
                    <AgreementProgress agreement={agreement} />
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block text-sm font-semibold tabular-nums text-tinta">{formatCurrency(agreement.totalAmount)}</span>
                  {agreement.discountAmount > 0 && <span className="block text-xs tabular-nums text-verde-tinta">− {formatCurrency(agreement.discountAmount)}</span>}
                </span>
                <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
              </button>
            </li>
          );
        })
      )}
    </ul>
  );
}

type AgreementDetailsModalProps = {
  agreement: AgreementResponse;
  canManage: boolean;
  onClose: () => void;
  onCancel: (agreement: AgreementResponse) => void;
};

export function AgreementDetailsModal({ agreement, canManage, onClose, onCancel }: AgreementDetailsModalProps) {
  const isActive = agreement.status === AGREEMENT_STATUS.active;

  return (
    <Modal
      size="lg"
      title={`Acordo · ${agreement.buildingName} · ${agreement.unitNumber}`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <AgreementStatusChip status={agreement.status} />
          <span>feito em {formatDate(agreement.createdAt)}</span>
          {agreement.endedAt && <span>· encerrado em {formatDate(agreement.endedAt)}</span>}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          {canManage && isActive && (
            <button type="button" onClick={() => onCancel(agreement)} className="mr-auto rounded-full px-2 text-sm font-semibold text-vermelho hover:underline">
              Cancelar acordo
            </button>
          )}
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <AgreementProgress agreement={agreement} />

        {agreement.endReason && <p className="rounded-block bg-campo px-4 py-3 text-[13px] text-tinta">{agreement.endReason}</p>}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-tinta-suave">Valor original</dt>
            <dd className="font-semibold tabular-nums text-tinta">{formatCurrency(agreement.originalAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-suave">Multa e juros</dt>
            <dd className="font-semibold tabular-nums text-tinta">{formatCurrency(agreement.fineAmount + agreement.interestAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-suave">Desconto</dt>
            <dd className="font-semibold tabular-nums text-verde-tinta">
              {agreement.discountAmount > 0 ? `− ${formatCurrency(agreement.discountAmount)}${agreement.discountType === 1 ? ` (${agreement.discountValue}%)` : ""}` : "–"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-suave">Total</dt>
            <dd className="font-bold tabular-nums text-tinta">{formatCurrency(agreement.totalAmount)}</dd>
          </div>
        </dl>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-tinta">Parcelas</h3>
          <AgreementInstallmentList agreement={agreement} />
          <p className="mt-2 text-xs text-tinta-suave">Quebra se uma parcela passar de {agreement.breakAfterDaysLate} dias de atraso. A baixa de cada parcela é feita na lista de cobranças.</p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-tinta">Cobranças renegociadas</h3>
          <ul className="divide-y divide-linha overflow-hidden rounded-block bg-campo">
            {agreement.originalCharges.map((charge) => (
              <li key={charge.chargeId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-tinta">{charge.description}</span>
                  <span className="block text-xs text-tinta-suave">venceu {formatCalendarDate(charge.dueDate)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm tabular-nums text-tinta">{formatCurrency(charge.value + charge.fineAmount + charge.interestAmount)}</span>
                  <ChargeStatusChip status={charge.status} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
