import { apiRequest } from "../../shared/lib/api/apiClient";
import type { CreateManualPaymentRequest, PaymentReceipt, PaymentResponse } from "./types";

export async function createManualPayment(
  chargeId: number,
  data: CreateManualPaymentRequest,
): Promise<PaymentResponse> {
  return apiRequest<PaymentResponse>(`/api/charges/${chargeId}/payments/manual`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function getPaymentsByCharge(chargeId: number): Promise<PaymentResponse[]> {
  return apiRequest<PaymentResponse[]>(`/api/charges/${chargeId}/payments`, {
    auth: true,
  });
}

export async function getPaymentReceipt(chargeId: number): Promise<PaymentReceipt> {
  return apiRequest<PaymentReceipt>(`/api/charges/${chargeId}/receipt`, {
    auth: true,
  });
}
