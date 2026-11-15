import { apiRequest } from "../../shared/lib/api/apiClient";
import type { ModuleKey } from "./modules";

export type CondominiumModules = {
  condominiumId: number;
  type: number;
  modules: Array<{ key: ModuleKey; label: string; enabled: boolean }>;
};

export async function getCondominiumModules(condominiumId: number): Promise<CondominiumModules> {
  return apiRequest<CondominiumModules>(`/api/condominiums/${condominiumId}/modules`, { auth: true });
}

export async function updateCondominiumModules(condominiumId: number, enabledModules: ModuleKey[]): Promise<CondominiumModules> {
  return apiRequest<CondominiumModules>(`/api/condominiums/${condominiumId}/modules`, {
    method: "PUT",
    body: { enabledModules },
    auth: true,
  });
}
