import { apiRequest } from "../../shared/lib/api/apiClient";
import type { CreatePersonUnitRequest, PersonUnitResponse } from "./types";

export async function getPeopleByUnit(unitId: number): Promise<PersonUnitResponse[]> {
  return apiRequest<PersonUnitResponse[]>(`/api/units/${unitId}/persons`, {
    auth: true,
  });
}

export async function linkPersonToUnit(
  unitId: number,
  data: CreatePersonUnitRequest,
): Promise<PersonUnitResponse> {
  return apiRequest<PersonUnitResponse>(`/api/units/${unitId}/persons`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function removePersonUnit(personUnitId: number): Promise<void> {
  await apiRequest<void>(`/api/person-units/${personUnitId}`, {
    method: "DELETE",
    auth: true,
  });
}
