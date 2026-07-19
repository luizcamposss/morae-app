import { apiRequest } from "../../shared/lib/api/apiClient";
import type { ChargeResponse, CreateChargeRequest } from "./types";

export async function getPlatformCharges(): Promise<ChargeResponse[]> {
  return apiRequest<ChargeResponse[]>("/api/charges/platform", {
    auth: true,
  });
}

export async function getChargesByCondominium(
  condominiumId: number,
): Promise<ChargeResponse[]> {
  return apiRequest<ChargeResponse[]>(`/api/condominiums/${condominiumId}/charges`, {
    auth: true,
  });
}

export async function getMyCharges(): Promise<ChargeResponse[]> {
  return apiRequest<ChargeResponse[]>("/api/my/charges", {
    auth: true,
  });
}

export async function createCharge(data: CreateChargeRequest): Promise<ChargeResponse> {
  return apiRequest<ChargeResponse>("/api/charges", {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function cancelCharge(id: number, reason: string): Promise<void> {
  await apiRequest<void>(`/api/charges/${id}/cancel`, {
    method: "PUT",
    body: { reason },
    auth: true,
  });
}
