import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { getCondominiumFinancialAccount } from "../financialAccounts/financialAccountService";
import type { FinancialAccountResponse } from "../financialAccounts/types";
import { getInvitationsByCondominium } from "../invitations/invitationService";
import type { InvitationResponse } from "../invitations/types";
import { getMercadoPagoConnectionStatus } from "../mercadoPago/mercadoPagoService";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";
import { getUnitsByBuilding } from "../units/unitService";
import type { CreateUnitRequest, UnitResponse } from "../units/types";

const INVITATION_STATUS_PENDING = 1;

export const SETUP_STEPS = [
  { key: "buildings", label: "Prédios", hint: "torres e andares" },
  { key: "units", label: "Unidades", hint: "geradas sozinhas" },
  { key: "residents", label: "Moradores", hint: "quem mora onde" },
  { key: "receiving", label: "Recebimento e convites", hint: "Pix e acesso ao app" },
] as const;

export type SetupStepKey = (typeof SETUP_STEPS)[number]["key"];

export type SetupData = {
  condominiumId: number;
  buildings: BuildingResponse[];
  units: UnitResponse[];
  people: PersonResponse[];
  invitations: InvitationResponse[];
  account: FinancialAccountResponse | null;
  isMercadoPagoConnected: boolean;
};

// Everything the wizard needs comes from what is already saved, so the admin can leave and come back.
export async function fetchSetupData(condominiumId: number): Promise<SetupData> {
  const [buildings, people, invitations, account, isMercadoPagoConnected] = await Promise.all([
    getBuildingsByCondominium(condominiumId),
    getPersonsByCondominium(condominiumId),
    getInvitationsByCondominium(condominiumId).catch(() => [] as InvitationResponse[]),
    getCondominiumFinancialAccount(condominiumId).catch(() => null),
    fetchMercadoPagoConnected(condominiumId),
  ]);
  const unitsByBuilding = await Promise.all(buildings.map((building) => getUnitsByBuilding(building.id)));
  return { condominiumId, buildings, units: unitsByBuilding.flat(), people, invitations, account, isMercadoPagoConnected };
}

export function fetchMercadoPagoConnected(condominiumId: number) {
  return getMercadoPagoConnectionStatus(condominiumId)
    .then((status) => status.isConnected)
    .catch(() => false);
}

// People that can still get an invitation: e-mail filled in, no app access and no valid pending invite.
export function invitablePeople(people: PersonResponse[], invitations: InvitationResponse[]) {
  const now = Date.now();
  const pending = new Set(
    invitations
      .filter((invitation) => invitation.invitationStatus === INVITATION_STATUS_PENDING && new Date(invitation.expiresAt).getTime() >= now)
      .map((invitation) => invitation.personId),
  );
  return people.filter((person) => person.email && !person.hasRegisteredUser && !pending.has(person.id));
}

export function hasPendingInvitation(personId: number, invitations: InvitationResponse[]) {
  return invitations.some((invitation) => invitation.personId === personId && invitation.invitationStatus === INVITATION_STATUS_PENDING);
}

export type SetupProgress = Record<SetupStepKey, boolean> & { doneCount: number };

export function setupProgress(
  data: Pick<SetupData, "buildings" | "units" | "people" | "invitations"> & { hasPixKey: boolean; isMercadoPagoConnected: boolean },
): SetupProgress {
  const steps = {
    buildings: data.buildings.length > 0,
    units: data.units.length > 0,
    residents: data.people.some((person) => person.unitCount > 0),
    receiving: (data.hasPixKey || data.isMercadoPagoConnected) && invitablePeople(data.people, data.invitations).length === 0,
  };
  return { ...steps, doneCount: Object.values(steps).filter(Boolean).length };
}

export function progressOf(data: SetupData) {
  return setupProgress({ ...data, hasPixKey: Boolean(data.account?.pixKey) });
}

// "Continuar configuração" can be hidden per condominium on the dashboard.
const dismissKey = (condominiumId: number) => `morae:admin-setup:${condominiumId}:dismissed`;

export function isSetupDismissed(condominiumId: number) {
  try {
    return localStorage.getItem(dismissKey(condominiumId)) === "1";
  } catch {
    return false;
  }
}

export function dismissSetup(condominiumId: number) {
  try {
    localStorage.setItem(dismissKey(condominiumId), "1");
  } catch {
    // Storage unavailable: the card simply comes back next time.
  }
}

// ---- Step 1: buildings typed in a list before saving ----

export type BuildingDraft = {
  id: string;
  name: string;
  code: string;
  floorCount: string;
  unitsPerFloor: string;
  hasElevator: boolean;
};

let draftSequence = 0;
export const nextDraftId = () => `draft-${++draftSequence}`;

export function emptyBuildingDraft(index: number): BuildingDraft {
  const letter = String.fromCharCode(65 + (index % 26));
  return { id: nextDraftId(), name: `Torre ${letter}`, code: letter, floorCount: "8", unitsPerFloor: "4", hasElevator: true };
}

export function validateBuildingDraft(draft: BuildingDraft, existingCodes: string[]) {
  const label = draft.name.trim() || "Prédio sem nome";
  if (!draft.name.trim() || !draft.code.trim()) return `${label}: informe nome e código.`;
  if (draft.name.trim().length > 100) return `${label}: o nome deve ter no máximo 100 caracteres.`;
  if (draft.code.trim().length > 30) return `${label}: o código deve ter no máximo 30 caracteres.`;
  const floors = Number(draft.floorCount);
  if (!Number.isInteger(floors) || floors < 1 || floors > 300) return `${label}: informe de 1 a 300 andares.`;
  const perFloor = Number(draft.unitsPerFloor);
  if (!Number.isInteger(perFloor) || perFloor < 1 || perFloor > 50) return `${label}: informe de 1 a 50 unidades por andar.`;
  if (existingCodes.includes(draft.code.trim().toUpperCase())) return `${label}: o código ${draft.code.trim()} já está em uso.`;
  return "";
}

// ---- Step 2: units generated from floors × units per floor ----

export type NumberingPattern = "floor" | "sequential";

export const numberingOptions = [
  { value: "floor", label: "Andar + posição (101, 102…)" },
  { value: "sequential", label: "Sequencial (1, 2, 3…)" },
];

export type UnitDraft = CreateUnitRequest & { id: string; buildingId: number; exists: boolean };

export type GenerationSettings = {
  pattern: NumberingPattern;
  withCode: boolean;
  unitType: number;
  squareMeters: string;
  rooms: string;
  bathrooms: string;
};

export const defaultGeneration: GenerationSettings = {
  pattern: "floor",
  withCode: false,
  unitType: 1,
  squareMeters: "",
  rooms: "2",
  bathrooms: "1",
};

export function unitNumber(pattern: NumberingPattern, floor: number, position: number, perFloor: number) {
  if (pattern === "sequential") return String((floor - 1) * perFloor + position);
  return `${floor}${String(position).padStart(2, "0")}`;
}

// Builds the preview for one building; numbers that already exist there are flagged and skipped on create.
export function generateUnits(building: BuildingResponse, perFloor: number, settings: GenerationSettings, existing: UnitResponse[]): UnitDraft[] {
  const taken = new Set(existing.filter((unit) => unit.buildingId === building.id).map((unit) => unit.number.toUpperCase()));
  const drafts: UnitDraft[] = [];
  for (let floor = 1; floor <= building.floorCount; floor++) {
    for (let position = 1; position <= perFloor; position++) {
      const base = unitNumber(settings.pattern, floor, position, perFloor);
      const number = settings.withCode ? `${building.code}${base}` : base;
      drafts.push({
        id: nextDraftId(),
        buildingId: building.id,
        number,
        unitType: settings.unitType,
        rooms: Number(settings.rooms) || 0,
        bathrooms: Number(settings.bathrooms) || 0,
        squareMeters: Number(settings.squareMeters) || 0,
        observations: "",
        exists: taken.has(number.toUpperCase()),
      });
    }
  }
  return drafts;
}

// Runs the calls a few at a time: fast enough for ~100 units without flooding the API.
export async function runInBatches<T, R>(items: T[], size: number, task: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = [];
  for (let start = 0; start < items.length; start += size) {
    results.push(...(await Promise.allSettled(items.slice(start, start + size).map(task))));
  }
  return results;
}

// ---- Step 3: quick residents table ----

export type ResidentDraft = {
  id: string;
  unitId: string;
  name: string;
  cpf: string;
  phoneNumber: string;
  email: string;
  relationshipType: number;
  error: string;
};

export function emptyResidentDraft(unitId = ""): ResidentDraft {
  return { id: nextDraftId(), unitId, name: "", cpf: "", phoneNumber: "", email: "", relationshipType: 1, error: "" };
}

export const isBlankResident = (row: ResidentDraft) => !row.name.trim() && !row.cpf && !row.phoneNumber && !row.email.trim();

export function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
