import { apiRequest } from "../../shared/lib/api/apiClient";

export type SyndicAccessKey = "residents" | "finance" | "communication" | "maintenance";

// The 12 permissions the Admin can grant to a syndic (Constants/AppPermissions.cs).
export type SyndicPermission =
  | "residents.view"
  | "charges.create"
  | "charges.mark_as_paid"
  | "delinquency.view"
  | "news.create"
  | "news.edit"
  | "occurrences.manage"
  | "maintenance.manage"
  | "visitors.manage"
  | "documents.manage"
  | "assemblies.manage"
  | "reservations.manage"
  | "expenses.manage";

// What a syndic screen asks for: one of the 4 menu areas or a single raw permission,
// or a list of them when any one is enough (e.g. the agenda, which mixes several modules).
type SingleSyndicRequirement = SyndicAccessKey | SyndicPermission;
export type SyndicAccessRequirement = SingleSyndicRequirement | SingleSyndicRequirement[];

// The 4 menu areas plus the raw permission list, for screens guarded by a single permission.
export type SyndicAccessSettings = Record<SyndicAccessKey, boolean> & { permissions: string[] };

type PermissionResponse = {
  userId?: number;
  condominiumId: number;
  role: string;
  permissions: string[];
};

// Which permissions open each area of the syndic menu (any one of them is enough).
const areaPermissions: Record<SyndicAccessKey, string[]> = {
  residents: ["residents.view"],
  finance: ["charges.create", "charges.mark_as_paid", "delinquency.view"],
  communication: ["news.create", "news.edit"],
  maintenance: ["occurrences.manage"],
};

export const noSyndicAccess: SyndicAccessSettings = {
  residents: false,
  finance: false,
  communication: false,
  maintenance: false,
  permissions: [],
};

export function hasSyndicAccess(access: SyndicAccessSettings | null | undefined, requirement: SyndicAccessRequirement): boolean {
  if (!access) {
    return false;
  }

  if (Array.isArray(requirement)) {
    return requirement.some((item) => hasSyndicAccess(access, item));
  }

  return requirement in areaPermissions
    ? access[requirement as SyndicAccessKey]
    : access.permissions.includes(requirement);
}

// The 12 syndic permissions the Admin can turn on/off, grouped by area for the settings screen.
export const syndicPermissionGroups: Array<{
  title: string;
  permissions: Array<{ key: SyndicPermission; label: string; description: string }>;
}> = [
  {
    title: "Moradores",
    permissions: [
      { key: "residents.view", label: "Ver moradores", description: "Consulta moradores, vínculos e unidades." },
    ],
  },
  {
    title: "Financeiro",
    permissions: [
      { key: "charges.create", label: "Criar cobranças", description: "Lança taxas e cobranças para as unidades." },
      { key: "charges.mark_as_paid", label: "Dar baixa em pagamentos", description: "Marca cobranças como pagas." },
      { key: "delinquency.view", label: "Ver inadimplência", description: "Acompanha quem está com pagamento atrasado." },
    ],
  },
  {
    title: "Comunicados",
    permissions: [
      { key: "news.create", label: "Publicar comunicados", description: "Escreve avisos para os moradores." },
      { key: "news.edit", label: "Editar comunicados", description: "Altera e remove avisos já publicados." },
    ],
  },
  {
    title: "Operação",
    permissions: [
      { key: "occurrences.manage", label: "Cuidar das ocorrências", description: "Acompanha e responde às ocorrências." },
      { key: "maintenance.manage", label: "Manutenção preventiva", description: "Cadastra e registra as manutenções do prédio." },
      { key: "visitors.manage", label: "Visitantes", description: "Libera e acompanha a entrada de visitantes." },
      { key: "reservations.manage", label: "Reservas de áreas comuns", description: "Cadastra áreas, aprova e recusa reservas." },
    ],
  },
  {
    title: "Gestão",
    permissions: [
      { key: "documents.manage", label: "Documentos", description: "Envia e organiza atas, regimentos e contratos." },
      { key: "assemblies.manage", label: "Assembleias e votações", description: "Cria pautas, abre e encerra votações." },
      { key: "expenses.manage", label: "Despesas", description: "Lança as contas pagas e os comprovantes da prestação de contas." },
    ],
  },
];

export const syndicPermissionCount = syndicPermissionGroups.reduce((total, group) => total + group.permissions.length, 0);

export type SyndicBuildings = {
  allBuildings: boolean;
  buildingIds: number[];
};

type SyndicBuildingsResponse = {
  allBuildings: boolean;
  buildings: Array<{ id: number; name: string }>;
};

export async function getMySyndicAccess(condominiumId: number): Promise<SyndicAccessSettings> {
  const result = await apiRequest<PermissionResponse>(
    `/api/me/permissions?condominiumId=${condominiumId}`,
    { auth: true },
  );

  return mapPermissionsToAccess(result.permissions);
}

export async function getSyndicPermissions(condominiumId: number, userId: number): Promise<string[]> {
  const result = await apiRequest<PermissionResponse>(
    `/api/condominiums/${condominiumId}/syndics/${userId}/permissions`,
    { auth: true },
  );

  return result.permissions;
}

export async function updateSyndicPermissions(
  condominiumId: number,
  userId: number,
  permissions: string[],
): Promise<string[]> {
  const result = await apiRequest<PermissionResponse>(
    `/api/condominiums/${condominiumId}/syndics/${userId}/permissions`,
    { method: "PUT", auth: true, body: { permissions } },
  );

  return result.permissions;
}

export async function getSyndicBuildings(condominiumId: number, userId: number): Promise<SyndicBuildings> {
  const result = await apiRequest<SyndicBuildingsResponse>(
    `/api/condominiums/${condominiumId}/syndics/${userId}/buildings`,
    { auth: true },
  );

  return toSyndicBuildings(result);
}

export async function updateSyndicBuildings(
  condominiumId: number,
  userId: number,
  buildings: SyndicBuildings,
): Promise<SyndicBuildings> {
  const result = await apiRequest<SyndicBuildingsResponse>(
    `/api/condominiums/${condominiumId}/syndics/${userId}/buildings`,
    { method: "PUT", auth: true, body: buildings },
  );

  return toSyndicBuildings(result);
}

function toSyndicBuildings(result: SyndicBuildingsResponse): SyndicBuildings {
  return { allBuildings: result.allBuildings, buildingIds: result.buildings.map((building) => building.id) };
}

function mapPermissionsToAccess(permissions: string[]): SyndicAccessSettings {
  const permissionSet = new Set(permissions);

  return {
    residents: areaPermissions.residents.some((permission) => permissionSet.has(permission)),
    finance: areaPermissions.finance.some((permission) => permissionSet.has(permission)),
    communication: areaPermissions.communication.some((permission) =>
      permissionSet.has(permission),
    ),
    maintenance: areaPermissions.maintenance.some((permission) => permissionSet.has(permission)),
    permissions,
  };
}
