import { apiRequest } from "../../shared/lib/api/apiClient";
import type { CreateUnitRequest, UnitResponse } from "./types";

export async function getUnitsByBuilding(buildingId: number): Promise<UnitResponse[]> {
  return apiRequest<UnitResponse[]>(`/api/buildings/${buildingId}/units`, {
    auth: true,
  });
}

export async function createUnit(
  buildingId: number,
  data: CreateUnitRequest,
): Promise<UnitResponse> {
  return apiRequest<UnitResponse>(`/api/buildings/${buildingId}/units`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function updateUnit(
  unitId: number,
  data: CreateUnitRequest,
): Promise<void> {
  await apiRequest<void>(`/api/Units/${unitId}`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function deleteUnit(unitId: number): Promise<void> {
  await apiRequest<void>(`/api/Units/${unitId}`, {
    method: "DELETE",
    auth: true,
  });
}
