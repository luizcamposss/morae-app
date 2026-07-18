import { apiRequest } from "../../shared/lib/api/apiClient";
import type { MeCondominiumResponse, MeResponse } from "./types";

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
