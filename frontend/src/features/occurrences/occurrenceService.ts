import { apiBlob, apiDownload, apiRequest } from "../../shared/lib/api/apiClient";
import type {
  CreateOccurrenceRequest,
  OccurrencePhoto,
  OccurrenceResponse,
  RespondOccurrenceRequest,
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

// With photos the request goes as multipart/form-data (same route, up to 5 JPG/PNG).
export async function createOccurrence(
  data: CreateOccurrenceRequest,
  photos: File[] = [],
): Promise<OccurrenceResponse> {
  let body: CreateOccurrenceRequest | FormData = data;

  if (photos.length > 0) {
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) form.append(key, String(value));
    for (const photo of photos) form.append("photos", photo);
    body = form;
  }

  return apiRequest<OccurrenceResponse>("/api/occurrences", {
    method: "POST",
    body,
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

export async function respondToOccurrence(
  id: number,
  data: RespondOccurrenceRequest,
): Promise<OccurrenceResponse> {
  return apiRequest<OccurrenceResponse>(`/api/occurrences/${id}/response`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function getOccurrencePhoto(photoId: number): Promise<Blob> {
  return apiBlob(`/api/occurrence-photos/${photoId}`);
}

export async function downloadOccurrencePhoto(photo: OccurrencePhoto): Promise<void> {
  await apiDownload(`/api/occurrence-photos/${photo.id}`, photo.fileName);
}
