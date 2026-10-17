import type { BuildingResponse, CreateBuildingRequest } from "./types";

export const BUILDING_TYPE_OPTIONS = ["Residencial", "Comercial", "Misto", "Garagem", "Lazer"];

// Same limits as the backend DTO.
export const BUILDING_FIELD_LIMITS = {
  name: 100,
  code: 30,
  buildingType: 30,
  floorCount: 300,
  notes: 500,
};

export const emptyBuildingForm: CreateBuildingRequest = {
  name: "",
  code: "",
  buildingType: "Residencial",
  floorCount: 0,
  hasElevator: false,
  notes: "",
};

export function toBuildingForm(building: BuildingResponse): CreateBuildingRequest {
  return {
    name: building.name,
    code: building.code,
    buildingType: building.buildingType,
    floorCount: building.floorCount,
    hasElevator: building.hasElevator,
    notes: building.notes,
  };
}

// Returns the first problem with the form, or "" when it can be sent.
export function validateBuildingForm(payload: CreateBuildingRequest) {
  if (!payload.name || !payload.code || !payload.buildingType) return "Informe nome, código e tipo do prédio.";
  if (payload.name.length > BUILDING_FIELD_LIMITS.name) return "O nome do prédio deve ter no máximo 100 caracteres.";
  if (payload.code.length > BUILDING_FIELD_LIMITS.code) return "O código do prédio deve ter no máximo 30 caracteres.";
  if (payload.buildingType.length > BUILDING_FIELD_LIMITS.buildingType) return "O tipo do prédio deve ter no máximo 30 caracteres.";
  if (payload.notes.length > BUILDING_FIELD_LIMITS.notes) return "As observações devem ter no máximo 500 caracteres.";
  if (Number.isNaN(payload.floorCount) || payload.floorCount < 0 || payload.floorCount > BUILDING_FIELD_LIMITS.floorCount) {
    return "Informe uma quantidade de andares entre 0 e 300.";
  }
  return "";
}

export function occupancyOf(building: Pick<BuildingResponse, "unitCount" | "occupiedUnitCount">) {
  return building.unitCount > 0 ? Math.round((building.occupiedUnitCount / building.unitCount) * 100) : 0;
}

export function buildingStatusLabel(status: string) {
  return status === "Atencao" ? "Atenção" : status;
}
