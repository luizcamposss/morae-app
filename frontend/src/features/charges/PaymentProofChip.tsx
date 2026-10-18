import { FileCheck, FileX } from "lucide-react";
import { proofState } from "./paymentProof";
import type { ChargeResponse } from "./types";

// "Comprovante enviado" / "Comprovante recusado" on open charges paid by Pix with a receipt.
export function PaymentProofChip({ charge }: { charge: ChargeResponse }) {
  const state = proofState(charge);
  if (!state) return null;

  const isSent = state === "sent";
  const Icon = isSent ? FileCheck : FileX;

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-chip px-2 py-0.5 text-xs font-semibold ${isSent ? "bg-verde-suave text-verde-tinta" : "bg-vermelho-suave text-vermelho"}`}>
      <Icon size={13} strokeWidth={2} aria-hidden />
      {isSent ? "Comprovante enviado" : "Comprovante recusado"}
    </span>
  );
}
