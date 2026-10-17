import type { OccurrencePriority, OccurrenceResponse, OccurrenceStatus, OccurrenceType } from "./types";

// Limit from OccurrenceService.RespondAsync.
export const RESPONSE_MAX = 2000;

export const OCCURRENCE_STATUS = { open: 1, inProgress: 2, resolved: 3, canceled: 4 } as const satisfies Record<string, OccurrenceStatus>;

export const occurrenceStatuses: Array<{ value: OccurrenceStatus; label: string; plural: string; tone: string }> = [
  { value: 1, label: "Aberta", plural: "Abertas", tone: "bg-vermelho-suave text-vermelho" },
  { value: 2, label: "Em andamento", plural: "Em andamento", tone: "bg-ambar-suave text-ambar" },
  { value: 3, label: "Resolvida", plural: "Resolvidas", tone: "bg-verde-suave text-verde-tinta" },
  { value: 4, label: "Cancelada", plural: "Canceladas", tone: "bg-campo text-tinta-suave" },
];

const occurrenceTypes: Record<number, string> = {
  1: "Manutenção",
  2: "Segurança",
  3: "Limpeza",
  4: "Barulho",
  5: "Área comum",
  6: "Outro",
};

const occurrencePriorities: Record<number, { label: string; tone: string }> = {
  1: { label: "Baixa", tone: "text-tinta-suave" },
  2: { label: "Média", tone: "text-tinta-suave" },
  3: { label: "Alta", tone: "text-ambar" },
  4: { label: "Urgente", tone: "text-vermelho" },
};

export function statusMeta(status: OccurrenceStatus) {
  return occurrenceStatuses.find((item) => item.value === status) ?? occurrenceStatuses[0];
}

export function typeLabel(type: OccurrenceType) {
  return occurrenceTypes[type] ?? "Outro";
}

export function priorityMeta(priority: OccurrencePriority) {
  return occurrencePriorities[priority] ?? occurrencePriorities[2];
}

// Open or in progress: still needs the management.
export function isPending(occurrence: OccurrenceResponse) {
  return occurrence.status === OCCURRENCE_STATUS.open || occurrence.status === OCCURRENCE_STATUS.inProgress;
}

// "Torre A · 101"; the building name is left out when the condominium has a single one.
export function formatPlace(occurrence: OccurrenceResponse, showBuilding = true) {
  return showBuilding ? `${occurrence.buildingName} · ${occurrence.unitNumber}` : `Unidade ${occurrence.unitNumber}`;
}

// Case- and accent-insensitive search over the fields shown in the list.
export function matchesSearch(occurrence: OccurrenceResponse, term: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const query = normalize(term.trim());
  if (!query) return true;

  return [occurrence.title, occurrence.description, occurrence.createdByName, occurrence.unitNumber, occurrence.buildingName, typeLabel(occurrence.type)]
    .some((value) => normalize(value ?? "").includes(query));
}
