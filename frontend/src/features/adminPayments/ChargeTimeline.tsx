import { useEffect, useState } from "react";
import { Ban, Bell, CircleCheck, FileText, FilePlus2, FileX2, type LucideIcon } from "lucide-react";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import { getPaymentProofs } from "../charges/paymentProofService";
import type { ChargeResponse, PaymentProof } from "../charges/types";
import { getPaymentsByCharge } from "../payments/paymentService";
import type { PaymentResponse } from "../payments/types";
import { buildChargeTimeline, formatEventTime, type TimelineEvent } from "./chargeTimeline";

type Loaded = { chargeId: number; proofs: PaymentProof[]; payments: PaymentResponse[] };

const kinds: Record<TimelineEvent["kind"], { icon: LucideIcon; tone: string }> = {
  created: { icon: FilePlus2, tone: "bg-campo text-tinta-suave" },
  reminder: { icon: Bell, tone: "bg-ambar-suave text-ambar" },
  proof: { icon: FileText, tone: "bg-campo text-tinta-suave" },
  rejected: { icon: FileX2, tone: "bg-vermelho-suave text-vermelho" },
  paid: { icon: CircleCheck, tone: "bg-verde-suave text-verde-tinta" },
  canceled: { icon: Ban, tone: "bg-campo text-tinta-suave" },
};

// "Histórico" in the charge details for the management: what Moraê did on its own (reminders)
// and what people did (receipts, payment, cancellation), in São Paulo time.
export function ChargeTimeline({ charge }: { charge: ChargeResponse }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const needsPayments = charge.status === CHARGE_STATUS.paid;
  const needsProofs = charge.scope === 2 && charge.latestProofStatus != null;

  useEffect(() => {
    let isMounted = true;

    // Secondary data: if it fails, the history still shows what came with the charge.
    Promise.all([
      needsProofs ? getPaymentProofs(charge.id).catch(() => []) : [],
      needsPayments ? getPaymentsByCharge(charge.id).catch(() => []) : [],
    ]).then(([proofs, payments]) => {
      if (isMounted) setLoaded({ chargeId: charge.id, proofs, payments });
    });

    return () => {
      isMounted = false;
    };
  }, [charge.id, needsPayments, needsProofs]);

  const current = loaded?.chargeId === charge.id ? loaded : null;
  const events = buildChargeTimeline(charge, current?.proofs ?? [], current?.payments ?? []);
  const isLoadingMore = !current && (needsPayments || needsProofs);

  return (
    <section aria-label="Histórico da cobrança" className="mt-5">
      <h3 className="text-sm font-semibold text-tinta">Histórico</h3>
      <ol className="mt-2">
        {events.map((event, index) => {
          const { icon: Icon, tone } = kinds[event.kind];
          const isLast = index === events.length - 1 && !isLoadingMore;
          return (
            <li key={event.key} className="relative flex gap-3 pb-3 last:pb-0">
              {!isLast && <span aria-hidden className="absolute bottom-0 left-[13px] top-7 w-px bg-linha" />}
              <span aria-hidden className={`relative grid size-7 shrink-0 place-items-center rounded-[8px] ${tone}`}>
                <Icon size={14} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-semibold text-tinta">{event.title}</span>
                  <time dateTime={event.at} className="text-xs tabular-nums text-tinta-suave">
                    {formatEventTime(event.at)}
                  </time>
                </span>
                {event.detail && <span className="block text-[13px] text-tinta-suave [overflow-wrap:anywhere]">{event.detail}</span>}
              </span>
            </li>
          );
        })}
        {isLoadingMore && <li className="ml-10 h-4 w-40 animate-pulse rounded-chip bg-campo" aria-label="Carregando histórico" />}
      </ol>
    </section>
  );
}
