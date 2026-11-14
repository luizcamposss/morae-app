import { apiBlob, apiRequest } from "../../shared/lib/api/apiClient";
import type {
  CommonAreaAvailability,
  CommonAreaResponse,
  CreateReservationRequest,
  ReservationFilters,
  ReservationResponse,
  SaveCommonAreaRequest,
} from "./types";

// Management: every area of the condominium, inactive ones too.
export async function getCommonAreas(condominiumId: number): Promise<CommonAreaResponse[]> {
  return apiRequest<CommonAreaResponse[]>(`/api/condominiums/${condominiumId}/common-areas`, { auth: true });
}

// Residents: the active areas their units can book.
export async function getBookableAreas(condominiumId: number): Promise<CommonAreaResponse[]> {
  return apiRequest<CommonAreaResponse[]>(`/api/condominiums/${condominiumId}/common-areas/bookable`, { auth: true });
}

export async function createCommonArea(condominiumId: number, data: SaveCommonAreaRequest): Promise<CommonAreaResponse> {
  return apiRequest<CommonAreaResponse>(`/api/condominiums/${condominiumId}/common-areas`, { method: "POST", body: data, auth: true });
}

export async function updateCommonArea(id: number, data: SaveCommonAreaRequest): Promise<CommonAreaResponse> {
  return apiRequest<CommonAreaResponse>(`/api/common-areas/${id}`, { method: "PUT", body: data, auth: true });
}

export async function deleteCommonArea(id: number): Promise<void> {
  await apiRequest<void>(`/api/common-areas/${id}`, { method: "DELETE", auth: true });
}

export async function uploadCommonAreaPhoto(id: number, file: File): Promise<CommonAreaResponse> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<CommonAreaResponse>(`/api/common-areas/${id}/photo`, { method: "PUT", body: form, auth: true });
}

export async function deleteCommonAreaPhoto(id: number): Promise<CommonAreaResponse> {
  return apiRequest<CommonAreaResponse>(`/api/common-areas/${id}/photo`, { method: "DELETE", auth: true });
}

export async function getCommonAreaPhoto(id: number): Promise<Blob> {
  return apiBlob(`/api/common-areas/${id}/photo`);
}

// One month ("yyyy-MM") of the area for one of the user's units.
export async function getAvailability(areaId: number, month: string, unitId?: number | null): Promise<CommonAreaAvailability> {
  const params = new URLSearchParams({ month });
  if (unitId) params.set("unitId", String(unitId));
  return apiRequest<CommonAreaAvailability>(`/api/common-areas/${areaId}/availability?${params}`, { auth: true });
}

export async function createReservation(condominiumId: number, data: CreateReservationRequest): Promise<ReservationResponse> {
  return apiRequest<ReservationResponse>(`/api/condominiums/${condominiumId}/reservations`, { method: "POST", body: data, auth: true });
}

export async function getMyReservations(condominiumId: number, includePast = false): Promise<ReservationResponse[]> {
  return apiRequest<ReservationResponse[]>(
    `/api/condominiums/${condominiumId}/my-reservations${includePast ? "?includePast=true" : ""}`,
    { auth: true },
  );
}

// Management list; without dates, from today to one year ahead.
export async function getReservations(condominiumId: number, filters: ReservationFilters = {}): Promise<ReservationResponse[]> {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", String(filters.status));
  if (filters.commonAreaId) params.set("commonAreaId", String(filters.commonAreaId));
  const query = params.toString();
  return apiRequest<ReservationResponse[]>(`/api/condominiums/${condominiumId}/reservations${query ? `?${query}` : ""}`, { auth: true });
}

export async function approveReservation(id: number): Promise<ReservationResponse> {
  return apiRequest<ReservationResponse>(`/api/reservations/${id}/approve`, { method: "POST", auth: true });
}

export async function rejectReservation(id: number, reason: string): Promise<ReservationResponse> {
  return apiRequest<ReservationResponse>(`/api/reservations/${id}/reject`, { method: "POST", body: { reason }, auth: true });
}

export async function cancelReservation(id: number, reason?: string): Promise<ReservationResponse> {
  return apiRequest<ReservationResponse>(`/api/reservations/${id}/cancel`, { method: "POST", body: { reason: reason || null }, auth: true });
}
