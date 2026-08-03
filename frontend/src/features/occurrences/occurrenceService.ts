import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  CreateOccurrenceRequest,
  OccurrenceResponse,
  UpdateOccurrenceStatusRequest,
} from "./types";

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

export async function createOccurrence(
  data: CreateOccurrenceRequest,
): Promise<OccurrenceResponse> {
  return apiRequest<OccurrenceResponse>("/api/occurrences", {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function updateOccurrenceStatus(
  id: number,
  data: UpdateOccurrenceStatusRequest,
): Promise<void> {
  await apiRequest<void>(`/api/occurrences/${id}/status`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}
