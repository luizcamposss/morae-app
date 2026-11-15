import { apiRequest } from "../../shared/lib/api/apiClient";
import type { Guides } from "./types";

export function updateGuides(data: { showTips?: boolean; markSeen?: string[]; resetTips?: boolean }) {
  return apiRequest<Guides>("/api/me/guides", {
    method: "PUT",
    body: data,
    auth: true,
  });
}
