import { CHARGE_STATUS } from "./platformRevenue";
import type { ChargeResponse } from "./types";

export const PAYMENT_PROOF_STATUS = { pending: 1, accepted: 2, rejected: 3 } as const;
export const PROOF_NOTE_MAX = 500;
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const PROOF_ACCEPT = ".pdf,.jpg,.jpeg,.png";

export type ProofState = "sent" | "rejected" | null;

// What the screens show about the Pix receipt of an open charge.
export function proofState(charge: ChargeResponse): ProofState {
  if (charge.status !== CHARGE_STATUS.pending && charge.status !== CHARGE_STATUS.overdue) return null;
  if (charge.pendingProofCount > 0) return "sent";
  if (charge.latestProofStatus === PAYMENT_PROOF_STATUS.rejected) return "rejected";
  return null;
}

// Quick check before uploading; the API still inspects the real content.
export function validateProofFile(file: File) {
  const name = file.name.toLowerCase();
  if (![".pdf", ".jpg", ".jpeg", ".png"].some((extension) => name.endsWith(extension))) return "Envie o comprovante em PDF, JPG ou PNG.";
  if (file.size > PROOF_MAX_BYTES) return "O comprovante pode ter no máximo 10 MB.";
  return "";
}
