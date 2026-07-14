import type { AuthResponse, LoginRequest } from "./types";
import { apiRequest } from "../../shared/lib/api/apiClient";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/Auth/login", {
    method: "POST",
    body: data,
  });
}