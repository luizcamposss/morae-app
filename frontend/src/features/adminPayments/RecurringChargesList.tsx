import { Pause, Play, Repeat } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { formatCurrency } from "../../shared/lib/currency";
import { categoryLabel } from "../charges/chargeCategories";
import type { RecurringChargeResponse } from "../charges/types";
import { StatusChip } from "../settings/StatusChip";
import { recurringStatuses } from "./chargeForm";

type RecurringChargesListProps = {
  items: RecurringChargeResponse[];
  isLoading: boolean;
  busyId: number | null;
  onCreate: () => void;
  onPause: (item: RecurringChargeResponse) => void;
  onResume: (item: RecurringChargeResponse) => void;
  onEnd: (item: RecurringChargeResponse) => void;
  // False hides create/pause/resume/end (syndic without permission to create charges).
  canManage?: boolean;
};

const STATUS_ORDER = { 1: 0, 2: 1, 3: 2 } as const;

// Monthly charges the scheduled job generates by itself: active first, ended at the bottom.
export function RecurringChargesList({ items, isLoading, busyId, onCreate, onPause, onResume, onEnd, canManage = true }: RecurringChargesListProps) {
  const sorted = [...items].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.description.localeCompare(b.description, "pt-BR"));

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-card bg-superficie px-5 py-12 text-center shadow-whisper">
        {isLoading ? (
          <span className="text-sm text-tinta-suave">Carregando…</span>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
              <Repeat size={22} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhuma recorrência ainda</span>
            <span className="mt-1 max-w-sm text-sm text-tinta-suave">
              Crie a taxa do condomínio uma vez e o Moraê gera as cobranças de cada unidade todo mês, 10 dias antes do vencimento.
            </span>
            {canManage && (
              <Button variant="quiet" size="sm" className="mt-5" onClick={onCreate}>
                Criar recorrência
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
      {sorted.map((item) => {
        const status = recurringStatuses[item.status];
        const isEnded = item.status === 3;
        const isBusy = busyId === item.id;
        const customCount = item.unitValues.length;

        return (
          <li key={item.id} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${isEnded ? "opacity-70" : ""}`}>
            <span className="flex min-w-0 flex-1 items-center gap-4">
              <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-field ${isEnded ? "bg-campo text-tinta-suave" : "bg-verde-suave text-verde-tinta"}`}>
                <Repeat size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-tinta">{item.description}</span>
                <span className="mt-0.5 flex items-center gap-2 text-[13px] text-tinta-suave">
                  <StatusChip tone={status.tone}>{status.label}</StatusChip>
                  <span className="truncate">
                    {categoryLabel(item.category)} ·{" "}
                    {item.unitId ? `${item.buildingName} · ${item.unitNumber}${item.recipientName ? ` · só ${item.recipientName}` : ""}` : (item.buildingName ?? "Todo o condomínio")} · todo dia{" "}
                    {item.effectiveDueDay}
                    {customCount > 0 && ` · ${customCount} ${customCount === 1 ? "unidade" : "unidades"} com valor próprio`}
                  </span>
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-tinta">{formatCurrency(item.value)}</span>
            </span>

            {!isEnded && canManage && (
              <span className="flex gap-2 sm:shrink-0">
                {item.status === 1 ? (
                  <Button variant="quiet" size="sm" onClick={() => onPause(item)} disabled={isBusy}>
                    <Pause size={15} strokeWidth={2} aria-hidden />
                    Pausar
                  </Button>
                ) : (
                  <Button variant="quiet" size="sm" onClick={() => onResume(item)} disabled={isBusy}>
                    <Play size={15} strokeWidth={2} aria-hidden />
                    Retomar
                  </Button>
                )}
                <Button variant="quiet" size="sm" onClick={() => onEnd(item)} disabled={isBusy} className="text-vermelho!">
                  Encerrar
                </Button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
