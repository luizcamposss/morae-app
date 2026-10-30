import { apiRequest } from "../../shared/lib/api/apiClient";
import type { LandingContactResponse, LandingContactStatus, UpdateLandingContactStatusRequest } from "./types";

// Newest first. Without a status, every contact.
export async function getLandingContacts(status?: LandingContactStatus): Promise<LandingContactResponse[]> {
  return apiRequest<LandingContactResponse[]>(`/api/landing-contacts${status ? `?status=${status}` : ""}`, {
    auth: true,
  });
}

export async function updateLandingContactStatus(
  id: number,
  data: UpdateLandingContactStatusRequest,
): Promise<LandingContactResponse> {
  return apiRequest<LandingContactResponse>(`/api/landing-contacts/${id}/status`, {
    method: "PATCH",
    body: data,
    auth: true,
  });
}
