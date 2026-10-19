import { amountDue } from "../adminPayments/chargeForm";
import type { ChargeResponse } from "../charges/types";
import type { CondominiumResponse } from "../condominiums/types";
import type { InvitationResponse } from "../invitations/types";
import { ACTIVE_STATUS, ADMIN_ROLE, PENDING_INVITATION_STATUS } from "./condominiumForm";

export const EXPIRED_INVITATION_STATUS = 4;

const CHARGE_STATUS_PENDING = 1;
const CHARGE_STATUS_OVERDUE = 3;
const CHARGE_STATUS_CANCELED = 4;

export type Situation = "ok" | "late" | "inactive";

export type CondominiumBilling = {
  // Value of the most recent subscription (by due date), shown as "R$ x/mês".
  monthlyValue?: number;
  // Earliest unpaid subscription: next due date, or the oldest overdue one.
  nextDue?: string;
  overdueValue: number;
};

// Subscription info per condominium, from the platform charges the Master already loads.
export function buildBillingIndex(charges: ChargeResponse[]) {
  const index = new Map<number, CondominiumBilling & { lastDue?: string }>();

  for (const charge of charges) {
    if (charge.status === CHARGE_STATUS_CANCELED) continue;

    const entry = index.get(charge.condominiumId) ?? { overdueValue: 0 };

    if (!entry.lastDue || charge.dueDate > entry.lastDue) {
      entry.lastDue = charge.dueDate;
      entry.monthlyValue = charge.value;
    }

    if (charge.status === CHARGE_STATUS_OVERDUE) entry.overdueValue += amountDue(charge);

    const isUnpaid = charge.status === CHARGE_STATUS_PENDING || charge.status === CHARGE_STATUS_OVERDUE;
    if (isUnpaid && (!entry.nextDue || charge.dueDate < entry.nextDue)) entry.nextDue = charge.dueDate;

    index.set(charge.condominiumId, entry);
  }

  return index as Map<number, CondominiumBilling>;
}

export function getSituation(condominium: CondominiumResponse, billing?: CondominiumBilling): Situation {
  if (condominium.status !== ACTIVE_STATUS) return "inactive";
  return billing && billing.overdueValue > 0 ? "late" : "ok";
}

// Admin invitations still waiting (pending) or that need a new link (expired), by condominium.
export function groupOpenAdminInvitations(invitations: InvitationResponse[]) {
  const index = new Map<number, InvitationResponse[]>();
  const isOpen = (status: number) => status === PENDING_INVITATION_STATUS || status === EXPIRED_INVITATION_STATUS;

  // Newest first, so a resent invitation hides the expired one it replaced (one entry per e-mail).
  const newestFirst = [...invitations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const seen = new Set<string>();

  for (const invitation of newestFirst) {
    const key = `${invitation.condominiumId}:${invitation.email}`;
    if (invitation.role !== ADMIN_ROLE || seen.has(key)) continue;
    seen.add(key);
    if (!isOpen(invitation.invitationStatus)) continue;
    index.set(invitation.condominiumId, [...(index.get(invitation.condominiumId) ?? []), invitation]);
  }

  return index;
}
