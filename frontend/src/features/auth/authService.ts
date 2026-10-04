import type { AuthResponse, LoginRequest } from "./types";
import { apiRequest } from "../../shared/lib/api/apiClient";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: data,
    // Lets the browser store the refresh-token cookie set by the API.
    withCredentials: true,
  });
}

// Ends the session on the server (revokes the refresh token and clears its cookie).
export async function logout(): Promise<void> {
  return apiRequest<void>("/api/auth/logout", {
    method: "POST",
    withCredentials: true,
  });
}
