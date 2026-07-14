import { getToken } from "../auth/authStorage";
import type { MeResponse } from "./types";

const API_BASE_URL = "http://localhost:5242";

export async function getMe(): Promise<MeResponse> {
  const token = getToken();

  if (!token) {
    throw new Error("Usuario nao autenticado.");
  }

  const response = await fetch(`${API_BASE_URL}/api/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o usuario autenticado.");
  }

  const result: MeResponse = await response.json();
  return result;
}