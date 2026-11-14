import { useCondominium } from "../../app/providers/useCondominium";

// Mirrors backend Constants/AppModules. Finance, residents, units and notices are always on.
export type ModuleKey =
  | "occurrences"
  | "visitors"
  | "maintenance"
  | "documents"
  | "assemblies"
  | "reservations"
  | "agreements"
  | "expenses"
  | "rentals";

// A screen that mixes modules (e.g. the agenda) lists them all: any one enabled is enough.
export type ModuleRequirement = ModuleKey | ModuleKey[];

export const ALL_MODULES: ModuleKey[] = ["occurrences", "visitors", "maintenance", "documents", "assemblies", "reservations", "agreements", "expenses", "rentals"];

// What each module is, in the Admin settings.
export const moduleDescriptions: Record<ModuleKey, string> = {
  occurrences: "Moradores relatam problemas e a gestão responde.",
  visitors: "Moradores avisam visitas e a gestão vê a agenda.",
  maintenance: "Agenda de manutenções obrigatórias, com lembretes.",
  documents: "Atas, regimento e arquivos para os moradores.",
  assemblies: "Convocação, votação online e resultado.",
  reservations: "Salão, churrasqueira e outras áreas, com aprovação.",
  agreements: "Parcelar dívidas atrasadas. Desligado, os acordos que já existem continuam.",
  expenses: "Lançar despesas e mostrar o balanço do mês aos moradores.",
  rentals: "Contratos de aluguel: o aluguel entra sozinho na conta do inquilino.",
};

// A syndic permission that belongs to a module (same map as the backend): hidden while it is off.
export const moduleByPermission: Partial<Record<string, ModuleKey>> = {
  "occurrences.manage": "occurrences",
  "visitors.manage": "visitors",
  "maintenance.manage": "maintenance",
  "documents.manage": "documents",
  "assemblies.manage": "assemblies",
  "reservations.manage": "reservations",
  "expenses.manage": "expenses",
  "rentals.manage": "rentals",
};

export const CONDOMINIUM_TYPE = { residential: 1, rental: 2, mixed: 3 } as const;

export const condominiumTypeOptions = [
  { value: CONDOMINIUM_TYPE.residential, label: "Condomínio residencial", hint: "Taxa de condomínio, assembleias, reservas e o dia a dia do prédio." },
  { value: CONDOMINIUM_TYPE.rental, label: "Prédio de aluguel", hint: "O dono aluga as unidades: aluguel e contas, sem assembleias." },
  { value: CONDOMINIUM_TYPE.mixed, label: "Os dois", hint: "Condomínio comum em que alguns proprietários alugam a unidade." },
];

export function condominiumTypeLabel(type: number | undefined) {
  return condominiumTypeOptions.find((option) => option.value === type)?.label ?? "Condomínio residencial";
}

export function isModuleEnabled(enabledModules: readonly string[] | undefined, requirement: ModuleRequirement) {
  // No list yet (loading, or the Master, who has no condominium area): nothing is hidden.
  if (!enabledModules) return true;
  const keys = Array.isArray(requirement) ? requirement : [requirement];
  return keys.some((key) => enabledModules.includes(key));
}

// Whether the active condominium uses that module.
export function useModuleEnabled(requirement: ModuleRequirement) {
  const { activeCondominium } = useCondominium();
  return isModuleEnabled(activeCondominium?.enabledModules, requirement);
}

// All flags at once, for screens that load several modules.
export function useEnabledModules() {
  const { activeCondominium } = useCondominium();
  return (key: ModuleRequirement) => isModuleEnabled(activeCondominium?.enabledModules, key);
}
