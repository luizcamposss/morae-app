import { apiRequest } from "../../shared/lib/api/apiClient";

export type SyndicAccessKey = "residents" | "finance" | "communication" | "maintenance";

export type SyndicAccessSettings = Record<SyndicAccessKey, boolean>;

type PermissionResponse = {
  userId?: number;
  condominiumId: number;
  role: string;
  permissions: string[];
};

const permissionGroups: Record<SyndicAccessKey, string[]> = {
  residents: ["residents.view"],
  finance: ["charges.create", "charges.mark_as_paid", "delinquency.view"],
  communication: ["news.create", "news.edit"],
  maintenance: ["occurrences.manage"],
};

export const defaultSyndicAccess: SyndicAccessSettings = {
  residents: true,
  finance: true,
  communication: true,
  maintenance: true,
};

export const syndicAccessOptions: Array<{
  key: SyndicAccessKey;
  label: string;
  description: string;
}> = [
  {
    key: "residents",
    label: "Moradores e unidades",
    description: "Permite consultar moradores, vínculos e unidades do condomínio.",
  },
  {
    key: "finance",
    label: "Financeiro",
    description: "Permite acompanhar cobranças, recebimentos e pendências financeiras.",
  },
  {
    key: "communication",
    label: "Comunicados",
    description: "Permite acessar avisos e comunicações oficiais do condomínio.",
  },
  {
    key: "maintenance",
    label: "Manutenção",
    description: "Permite acompanhar solicitações, ocorrências e rotinas operacionais.",
  },
];

export async function getMySyndicAccess(condominiumId: number): Promise<SyndicAccessSettings> {
  const result = await apiRequest<PermissionResponse>(
    `/api/me/permissions?condominiumId=${condominiumId}`,
    { auth: true },
  );

  return mapPermissionsToAccess(result.permissions);
}

export async function getSyndicAccess(
  condominiumId: number,
  userId: number,
): Promise<SyndicAccessSettings> {
  const result = await apiRequest<PermissionResponse>(
    `/api/condominiums/${condominiumId}/syndics/${userId}/permissions`,
    { auth: true },
  );

  return mapPermissionsToAccess(result.permissions);
}

export async function updateSyndicAccess(
  condominiumId: number,
  userId: number,
  access: SyndicAccessSettings,
): Promise<SyndicAccessSettings> {
  const result = await apiRequest<PermissionResponse>(
    `/api/condominiums/${condominiumId}/syndics/${userId}/permissions`,
    {
      method: "PUT",
      auth: true,
      body: {
        permissions: mapAccessToPermissions(access),
      },
    },
  );

  return mapPermissionsToAccess(result.permissions);
}

function mapPermissionsToAccess(permissions: string[]): SyndicAccessSettings {
  const permissionSet = new Set(permissions);

  return {
    residents: permissionGroups.residents.some((permission) => permissionSet.has(permission)),
    finance: permissionGroups.finance.some((permission) => permissionSet.has(permission)),
    communication: permissionGroups.communication.some((permission) =>
      permissionSet.has(permission),
    ),
    maintenance: permissionGroups.maintenance.some((permission) => permissionSet.has(permission)),
  };
}

function mapAccessToPermissions(access: SyndicAccessSettings) {
  return Object.entries(access).flatMap(([key, enabled]) =>
    enabled ? permissionGroups[key as SyndicAccessKey] : [],
  );
}
