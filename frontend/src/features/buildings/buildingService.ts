import { apiRequest } from "../../shared/lib/api/apiClient";
import type { BuildingResponse, CreateBuildingRequest } from "./types";

export async function getBuildingsByCondominium(
  condominiumId: number,
): Promise<BuildingResponse[]> {
  return apiRequest<BuildingResponse[]>(
    `/api/condominiums/${condominiumId}/buildings`,
    {
      auth: true,
    },
  );
}

export async function createBuilding(
  condominiumId: number,
  data: CreateBuildingRequest,
): Promise<BuildingResponse> {
  return apiRequest<BuildingResponse>(
    `/api/condominiums/${condominiumId}/buildings`,
    {
      method: "POST",
      body: data,
      auth: true,
    },
  );
}

export async function updateBuilding(
  buildingId: number,
  data: CreateBuildingRequest,
): Promise<void> {
  await apiRequest<void>(`/api/Buildings/${buildingId}`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}
