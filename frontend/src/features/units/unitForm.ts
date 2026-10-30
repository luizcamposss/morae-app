import type { CreateUnitRequest, UnitResponse } from "./types";

export const unitTypeOptions = [
  { value: 1, label: "Apartamento" },
  { value: 2, label: "Casa" },
  { value: 3, label: "Sala comercial" },
  { value: 4, label: "Loja" },
  { value: 5, label: "Garagem" },
  { value: 6, label: "Cobertura" },
];

export const relationshipOptions = [
  { value: 1, label: "Proprietário" },
  { value: 2, label: "Morador" },
  { value: 3, label: "Inquilino" },
];

export const UNIT_STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "Ocupada", label: "Ocupadas" },
  { value: "Vaga", label: "Vagas" },
] as const;

// Same limits as the backend DTO.
export const UNIT_FIELD_LIMITS = {
  number: 20,
  rooms: 20,
  bathrooms: 20,
  squareMeters: 10000,
  observations: 500,
};

export const emptyUnitForm: CreateUnitRequest = {
  number: "",
  unitType: 1,
  rooms: 1,
  bathrooms: 1,
  squareMeters: 0,
  observations: "",
};

export function toUnitForm(unit: UnitResponse): CreateUnitRequest {
  return {
    number: unit.number,
    unitType: unit.unitType,
    rooms: unit.rooms,
    bathrooms: unit.bathrooms,
    squareMeters: unit.squareMeters,
    observations: unit.observations,
  };
}

export function sanitizeUnitForm(form: CreateUnitRequest): CreateUnitRequest {
  return {
    number: form.number.trim(),
    unitType: form.unitType,
    rooms: Number(form.rooms),
    bathrooms: Number(form.bathrooms),
    squareMeters: Number(form.squareMeters),
    observations: form.observations.trim(),
  };
}

// Returns the first problem with the form, or "" when it can be sent.
export function validateUnitForm(form: CreateUnitRequest) {
  if (!form.number) return "Informe o número da unidade.";
  if (form.number.length > UNIT_FIELD_LIMITS.number) return "O número da unidade deve ter no máximo 20 caracteres.";
  if (form.unitType < 1 || form.unitType > 6) return "Selecione um tipo de unidade válido.";
  if (Number.isNaN(form.rooms) || form.rooms < 0 || form.rooms > UNIT_FIELD_LIMITS.rooms) return "Informe uma quantidade de quartos entre 0 e 20.";
  if (Number.isNaN(form.bathrooms) || form.bathrooms < 0 || form.bathrooms > UNIT_FIELD_LIMITS.bathrooms) {
    return "Informe uma quantidade de banheiros entre 0 e 20.";
  }
  if (Number.isNaN(form.squareMeters) || form.squareMeters < 0 || form.squareMeters > UNIT_FIELD_LIMITS.squareMeters) {
    return "Informe uma metragem entre 0 e 10.000 m².";
  }
  if (form.observations.length > UNIT_FIELD_LIMITS.observations) return "As observações devem ter no máximo 500 caracteres.";
  return "";
}

export function unitTypeLabel(unitType: number) {
  return unitTypeOptions.find((option) => option.value === unitType)?.label ?? "Não informado";
}

export function relationshipLabel(relationshipType: number) {
  return relationshipOptions.find((option) => option.value === relationshipType)?.label ?? "Não informado";
}
