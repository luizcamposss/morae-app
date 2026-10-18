import { apiBlob, apiDownload, apiRequest } from "../../shared/lib/api/apiClient";
import type { ChargePixInfo, PaymentProof } from "./types";

export async function getChargePixInfo(chargeId: number): Promise<ChargePixInfo> {
  return apiRequest<ChargePixInfo>(`/api/charges/${chargeId}/pix-info`, { auth: true });
}

export async function sendPaymentProof(chargeId: number, file: File, note: string): Promise<PaymentProof> {
  const form = new FormData();
  form.append("file", file);
  if (note.trim()) form.append("note", note.trim());

  return apiRequest<PaymentProof>(`/api/charges/${chargeId}/payment-proofs`, {
    method: "POST",
    body: form,
    auth: true,
  });
}

export async function getPaymentProofs(chargeId: number): Promise<PaymentProof[]> {
  return apiRequest<PaymentProof[]>(`/api/charges/${chargeId}/payment-proofs`, { auth: true });
}

export async function rejectPaymentProof(id: number, reason: string): Promise<PaymentProof> {
  return apiRequest<PaymentProof>(`/api/payment-proofs/${id}/reject`, {
    method: "PUT",
    body: { reason },
    auth: true,
  });
}

export async function getPaymentProofBlob(id: number): Promise<Blob> {
  return apiBlob(`/api/payment-proofs/${id}/file`);
}

export async function downloadPaymentProof(proof: Pick<PaymentProof, "id" | "fileName">): Promise<void> {
  await apiDownload(`/api/payment-proofs/${proof.id}/file`, proof.fileName);
}
