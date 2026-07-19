import { apiRequest } from "../../shared/lib/api/apiClient";
import type { OccurrenceResponse } from "./types";

export async function getOccurrencesByCondominium(
  condominiumId: number,
): Promise<OccurrenceResponse[]> {
  return apiRequest<OccurrenceResponse[]>(
    `/api/condominiums/${condominiumId}/occurrences`,
    { auth: true },
  );
}

export async function getMyOccurrences(): Promise<OccurrenceResponse[]> {
  return apiRequest<OccurrenceResponse[]>("/api/my/occurrences", {
    auth: true,
  });
}
