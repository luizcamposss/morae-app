import { isOpenCharge } from "../adminPayments/chargeForm";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";

export type BillsTab = "open" | "paid" | "all";

export const billsTabs: Array<{ key: BillsTab; label: string }> = [
  { key: "open", label: "Em aberto" },
  { key: "paid", label: "Pagos" },
  { key: "all", label: "Todos" },
];

// Router state used by the Início to open the payment of a charge right away.
export type BillsLocationState = { payChargeId?: number } | null;

export function filterBills(charges: ChargeResponse[], tab: BillsTab) {
  if (tab === "open") return charges.filter(isOpenCharge);
  if (tab === "paid") return charges.filter((charge) => charge.status === CHARGE_STATUS.paid);
  return charges;
}

// Open charges first (oldest due date on top), then the rest from the newest.
export function sortBills(charges: ChargeResponse[]) {
  return [...charges].sort((a, b) => {
    const openA = isOpenCharge(a);
    const openB = isOpenCharge(b);
    if (openA !== openB) return openA ? -1 : 1;
    return openA ? a.dueDate.localeCompare(b.dueDate) : b.dueDate.localeCompare(a.dueDate);
  });
}

// The charge to pay first: overdue before pending, then the oldest due date.
export function nextOpenCharge(charges: ChargeResponse[]) {
  return sortBills(charges.filter(isOpenCharge)).sort(
    (a, b) => Number(b.status === CHARGE_STATUS.overdue) - Number(a.status === CHARGE_STATUS.overdue),
  )[0];
}

// "Torre A · 101", or the condominium for charges without a unit.
// Where the bill is from; the owner's rent also says who receives it.
export function billPlace(charge: Pick<ChargeResponse, "buildingName" | "unitNumber" | "condominiumName" | "receiverName">) {
  const place = charge.unitNumber ? [charge.buildingName, charge.unitNumber].filter(Boolean).join(" · ") : charge.condominiumName;
  return charge.receiverName ? `${place} · para ${charge.receiverName}` : place;
}

export function describeDue(charge: Pick<ChargeResponse, "status" | "daysLate">, dueDate: string) {
  if (charge.status !== CHARGE_STATUS.overdue) return `Vence ${dueDate}`;
  if (charge.daysLate > 0) return `Venceu ${dueDate} · ${charge.daysLate} ${charge.daysLate === 1 ? "dia" : "dias"} de atraso`;
  return `Venceu ${dueDate}`;
}
