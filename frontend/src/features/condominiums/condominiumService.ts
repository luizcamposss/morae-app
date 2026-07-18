import { apiRequest } from "../../shared/lib/api/apiClient";
import type { CondominiumResponse } from "./types";

export async function getCondominiums(): Promise<CondominiumResponse[]> {
  return apiRequest<CondominiumResponse[]>("/api/condominium", {
    auth: true,
  });
}
