import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  CondominiumResponse,
  CreateCondominiumOnboardingRequest,
  CreateCondominiumRequest,
  UpdateCondominiumAdminRequest,
  UpdateCondominiumRequest,
} from "./types";

export async function getCondominiums(): Promise<CondominiumResponse[]> {
  return apiRequest<CondominiumResponse[]>("/api/condominium", {
    auth: true,
  });
}

export async function createCondominium(
  data: CreateCondominiumRequest,
): Promise<CondominiumResponse> {
  return apiRequest<CondominiumResponse>("/api/condominium", {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function onboardCondominium(
  data: CreateCondominiumOnboardingRequest,
): Promise<CondominiumResponse> {
  return apiRequest<CondominiumResponse>("/api/condominium/onboarding", {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function updateCondominium(
  id: number,
  data: UpdateCondominiumRequest,
): Promise<void> {
  return apiRequest<void>(`/api/condominium/${id}`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function updateCondominiumAdmin(
  id: number,
  data: UpdateCondominiumAdminRequest,
): Promise<void> {
  return apiRequest<void>(`/api/condominium/${id}/admin`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function removeCondominiumAdmin(id: number): Promise<void> {
  return apiRequest<void>(`/api/condominium/${id}/admin`, {
    method: "DELETE",
    auth: true,
  });
}

export async function deleteCondominium(id: number): Promise<void> {
  return apiRequest<void>(`/api/condominium/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
