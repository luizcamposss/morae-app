import { Ban, CircleCheck, Clock, Handshake, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ChargeResponse } from "../charges/types";

const statuses: Record<number, { label: string; tone: string; icon: LucideIcon }> = {
  1: { label: "Em aberto", tone: "bg-ambar-suave text-ambar", icon: Clock },
  2: { label: "Paga", tone: "bg-verde-suave text-verde-tinta", icon: CircleCheck },
  3: { label: "Atrasada", tone: "bg-vermelho-suave text-vermelho", icon: TriangleAlert },
  4: { label: "Cancelada", tone: "bg-campo text-tinta-suave", icon: Ban },
  5: { label: "Renegociada", tone: "bg-menu text-tinta", icon: Handshake },
};

const fallback = { label: "–", tone: "bg-campo text-tinta-suave", icon: Clock };

export function ChargeStatusChip({ status }: { status: ChargeResponse["status"] }) {
  const { label, tone } = statuses[status] ?? fallback;
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

// Icon tile tinted by the subscription status (list rows).
export function ChargeStatusTile({ status }: { status: ChargeResponse["status"] }) {
  const { tone, icon: Icon } = statuses[status] ?? fallback;
  return (
    <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-field ${tone}`}>
      <Icon size={18} strokeWidth={1.8} />
    </span>
  );
}
