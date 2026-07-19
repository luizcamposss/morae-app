import { apiRequest } from "../../shared/lib/api/apiClient";
import type { MeCondominiumResponse, MeResponse, MeUnitResponse } from "./types";

export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/api/me", {
    auth: true,
  });
}

export async function getMyCondominiums(): Promise<MeCondominiumResponse[]> {
  return apiRequest<MeCondominiumResponse[]>("/api/me/condominiums", {
    auth: true,
  });
}

export async function getMyUnits(): Promise<MeUnitResponse[]> {
  return apiRequest<MeUnitResponse[]>("/api/me/units", {
    auth: true,
  });
}
