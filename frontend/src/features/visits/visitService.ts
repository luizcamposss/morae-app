import { apiRequest } from "../../shared/lib/api/apiClient";
import type { SaveVisitRequest, VisitAgendaFilters, VisitResponse } from "./types";

// Visits of the user's own units (and the ones they announced). With includePast, also the
// canceled and past ones.
export async function getMyVisits(condominiumId: number, includePast = false): Promise<VisitResponse[]> {
  return apiRequest<VisitResponse[]>(`/api/condominiums/${condominiumId}/my-visits${includePast ? "?includePast=true" : ""}`, {
    auth: true,
  });
}

// Management agenda: up to 31 days per request.
export async function getVisitAgenda(condominiumId: number, filters: VisitAgendaFilters): Promise<VisitResponse[]> {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });

  if (filters.buildingId) params.set("buildingId", String(filters.buildingId));
  if (filters.unitId) params.set("unitId", String(filters.unitId));
  if (filters.visitorType) params.set("visitorType", String(filters.visitorType));
  if (filters.includeCanceled) params.set("includeCanceled", "true");

  return apiRequest<VisitResponse[]>(`/api/condominiums/${condominiumId}/visits?${params}`, {
    auth: true,
  });
}

export async function createVisit(condominiumId: number, data: SaveVisitRequest): Promise<VisitResponse> {
  return apiRequest<VisitResponse>(`/api/condominiums/${condominiumId}/visits`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function updateVisit(id: number, data: SaveVisitRequest): Promise<VisitResponse> {
  return apiRequest<VisitResponse>(`/api/visits/${id}`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function cancelVisit(id: number): Promise<VisitResponse> {
  return apiRequest<VisitResponse>(`/api/visits/${id}/cancel`, {
    method: "POST",
    auth: true,
  });
}
