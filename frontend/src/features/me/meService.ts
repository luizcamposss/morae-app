import { apiRequest } from "../../shared/lib/api/apiClient";
import type { MeResponse } from "./types";

export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/api/me", {
    auth: true,
  });
}