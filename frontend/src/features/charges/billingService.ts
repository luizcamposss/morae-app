import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  BillingSettings,
  ChargeBatchResult,
  CreateChargeBatchRequest,
  CreateRecurringChargeRequest,
  RecurringChargeResponse,
  UpdateBillingSettingsRequest,
} from "./types";

export async function getBillingSettings(condominiumId: number): Promise<BillingSettings> {
  return apiRequest<BillingSettings>(`/api/condominiums/${condominiumId}/billing-settings`, { auth: true });
}

export async function updateBillingSettings(condominiumId: number, data: UpdateBillingSettingsRequest): Promise<BillingSettings> {
  return apiRequest<BillingSettings>(`/api/condominiums/${condominiumId}/billing-settings`, {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function createChargeBatch(condominiumId: number, data: CreateChargeBatchRequest): Promise<ChargeBatchResult> {
  return apiRequest<ChargeBatchResult>(`/api/condominiums/${condominiumId}/charges/batch`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function getRecurringCharges(condominiumId: number): Promise<RecurringChargeResponse[]> {
  return apiRequest<RecurringChargeResponse[]>(`/api/condominiums/${condominiumId}/recurring-charges`, { auth: true });
}

export async function createRecurringCharge(condominiumId: number, data: CreateRecurringChargeRequest): Promise<RecurringChargeResponse> {
  return apiRequest<RecurringChargeResponse>(`/api/condominiums/${condominiumId}/recurring-charges`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

// Pause, resume (generates the month right away when inside the window) or end (cannot come back).
export async function changeRecurringCharge(id: number, action: "pause" | "resume" | "end"): Promise<RecurringChargeResponse> {
  return apiRequest<RecurringChargeResponse>(`/api/recurring-charges/${id}/${action}`, {
    method: "PUT",
    auth: true,
  });
}
