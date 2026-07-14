import type { AuthResponse, LoginRequest } from "./types";

const API_BASE_URL = "http://localhost:5242";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/Auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result: AuthResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Falha ao realizar login.");
  }

  return result;
}