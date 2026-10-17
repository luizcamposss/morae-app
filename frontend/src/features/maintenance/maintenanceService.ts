import { apiDownload, apiRequest } from "../../shared/lib/api/apiClient";
import type {
  CreateMaintenanceRecordRequest,
  MaintenancePlanResponse,
  MaintenanceRecordResponse,
  SaveMaintenancePlanRequest,
} from "./types";

// Sorted by the most urgent first.
export async function getMaintenancePlans(condominiumId: number): Promise<MaintenancePlanResponse[]> {
  return apiRequest<MaintenancePlanResponse[]>(`/api/condominiums/${condominiumId}/maintenance-plans`, { auth: true });
}

export async function createMaintenancePlan(condominiumId: number, data: SaveMaintenancePlanRequest): Promise<MaintenancePlanResponse> {
  return apiRequest<MaintenancePlanResponse>(`/api/condominiums/${condominiumId}/maintenance-plans`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

// Adds the common maintenances that are still missing; returns only the new ones.
export async function createDefaultMaintenancePlans(condominiumId: number): Promise<MaintenancePlanResponse[]> {
  return apiRequest<MaintenancePlanResponse[]>(`/api/condominiums/${condominiumId}/maintenance-plans/defaults`, {
    method: "POST",
    auth: true,
  });
}

export async function updateMaintenancePlan(id: number, data: SaveMaintenancePlanRequest): Promise<MaintenancePlanResponse> {
  return apiRequest<MaintenancePlanResponse>(`/api/maintenance-plans/${id}`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function deleteMaintenancePlan(id: number): Promise<void> {
  await apiRequest<void>(`/api/maintenance-plans/${id}`, { method: "DELETE", auth: true });
}

export async function getMaintenanceRecords(planId: number): Promise<MaintenanceRecordResponse[]> {
  return apiRequest<MaintenanceRecordResponse[]>(`/api/maintenance-plans/${planId}/records`, { auth: true });
}

export async function createMaintenanceRecord(planId: number, data: CreateMaintenanceRecordRequest): Promise<MaintenanceRecordResponse> {
  const form = new FormData();
  form.append("performedOn", data.performedOn);
  form.append("providerName", data.providerName);
  form.append("notes", data.notes);
  if (data.file) form.append("file", data.file);

  return apiRequest<MaintenanceRecordResponse>(`/api/maintenance-plans/${planId}/records`, {
    method: "POST",
    body: form,
    auth: true,
  });
}

export async function deleteMaintenanceRecord(id: number): Promise<void> {
  await apiRequest<void>(`/api/maintenance-records/${id}`, { method: "DELETE", auth: true });
}

// The attachment needs the token, so apiDownload fetches it and saves it from a temporary URL.
export async function downloadMaintenanceAttachment(record: MaintenanceRecordResponse): Promise<void> {
  await apiDownload(`/api/maintenance-records/${record.id}/attachment`, record.attachmentFileName ?? "anexo");
}
