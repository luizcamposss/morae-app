import { apiRequest } from "../../shared/lib/api/apiClient";
import type { NewsResponse } from "./types";

export async function getPlatformNews(): Promise<NewsResponse[]> {
  return apiRequest<NewsResponse[]>("/api/news/platform", {
    auth: true,
  });
}

export async function getNewsByCondominium(
  condominiumId: number,
): Promise<NewsResponse[]> {
  return apiRequest<NewsResponse[]>(`/api/condominiums/${condominiumId}/news`, {
    auth: true,
  });
}
