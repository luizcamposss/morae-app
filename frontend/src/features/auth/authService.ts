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

// Changes the password; the server keeps this session and ends the ones on other devices
// (the refresh-token cookie identifies this session, hence withCredentials).
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiRequest<void>("/api/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
    auth: true,
    withCredentials: true,
  });
}

// Always answers neutrally (the API never tells whether the e-mail exists).
export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<unknown>("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

// Uses the one-time code from the e-mail link; ends every other session of the user.
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  return apiRequest<void>("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
  });
}
