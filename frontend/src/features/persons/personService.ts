import { apiRequest } from "../../shared/lib/api/apiClient";
import type { CreatePersonRequest, PersonResponse } from "./types";

export async function getPersons(): Promise<PersonResponse[]> {
  return apiRequest<PersonResponse[]>("/api/persons", {
    auth: true,
  });
}

export async function createPersonInCondominium(
  condominiumId: number,
  data: CreatePersonRequest,
): Promise<PersonResponse> {
  return apiRequest<PersonResponse>(`/api/condominiums/${condominiumId}/persons`, {
    method: "POST",
    body: data,
    auth: true,
  });
}
