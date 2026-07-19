import { apiRequest } from "../../shared/lib/api/apiClient";
import type { MasterUserResponse, SuspendUserRequest } from "./types";

export async function getMasterUsers(): Promise<MasterUserResponse[]> {
  return apiRequest<MasterUserResponse[]>("/api/master/users", {
    auth: true,
  });
}

export async function suspendCondominiumUser(
  condominiumId: number,
  userId: number,
  data: SuspendUserRequest,
): Promise<void> {
  return apiRequest<void>(`/api/condominiums/${condominiumId}/users/${userId}/suspend`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function reactivateCondominiumUser(
  condominiumId: number,
  userId: number,
): Promise<void> {
  return apiRequest<void>(`/api/condominiums/${condominiumId}/users/${userId}/reactivate`, {
    method: "PUT",
    auth: true,
  });
}
