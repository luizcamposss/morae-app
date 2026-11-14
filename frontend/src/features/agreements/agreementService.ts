import { apiRequest } from "../../shared/lib/api/apiClient";
import type { AgreementResponse, CreateAgreementRequest } from "./types";

export async function getAgreementsByCondominium(condominiumId: number): Promise<AgreementResponse[]> {
  return apiRequest<AgreementResponse[]>(`/api/condominiums/${condominiumId}/agreements`, { auth: true });
}

export async function getMyAgreements(): Promise<AgreementResponse[]> {
  return apiRequest<AgreementResponse[]>("/api/my/agreements", { auth: true });
}

export async function createAgreement(condominiumId: number, data: CreateAgreementRequest): Promise<AgreementResponse> {
  return apiRequest<AgreementResponse>(`/api/condominiums/${condominiumId}/agreements`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function cancelAgreement(id: number, reason: string | null): Promise<AgreementResponse> {
  return apiRequest<AgreementResponse>(`/api/agreements/${id}/cancel`, {
    method: "PUT",
    body: { reason },
    auth: true,
  });
}
