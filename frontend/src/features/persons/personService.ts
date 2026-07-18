import { apiRequest } from "../../shared/lib/api/apiClient";
import type { CreatePersonRequest, PersonResponse, UpdatePersonRequest } from "./types";

export async function getPersons(): Promise<PersonResponse[]> {
  return apiRequest<PersonResponse[]>("/api/persons", {
    auth: true,
  });
}

export async function getPersonsByCondominium(
  condominiumId: number,
): Promise<PersonResponse[]> {
  return apiRequest<PersonResponse[]>(`/api/condominiums/${condominiumId}/persons`, {
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

export async function updatePersonInCondominium(
  condominiumId: number,
  personId: number,
  data: UpdatePersonRequest,
): Promise<void> {
  return apiRequest<void>(`/api/condominiums/${condominiumId}/persons/${personId}`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}
