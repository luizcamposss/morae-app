import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  FinancialAccountResponse,
  UpsertFinancialAccountRequest,
} from "./types";

export async function getPlatformFinancialAccount(): Promise<FinancialAccountResponse | null> {
  return apiRequest<FinancialAccountResponse | null>("/api/financial-accounts/platform", {
    auth: true,
  });
}

export async function upsertPlatformFinancialAccount(
  data: UpsertFinancialAccountRequest,
): Promise<FinancialAccountResponse> {
  return apiRequest<FinancialAccountResponse>("/api/financial-accounts/platform", {
    method: "PUT",
    body: data,
    auth: true,
  });
}

export async function getCondominiumFinancialAccount(
  condominiumId: number,
): Promise<FinancialAccountResponse | null> {
  return apiRequest<FinancialAccountResponse | null>(
    `/api/condominiums/${condominiumId}/financial-account`,
    { auth: true },
  );
}

export async function upsertCondominiumFinancialAccount(
  condominiumId: number,
  data: UpsertFinancialAccountRequest,
): Promise<FinancialAccountResponse> {
  return apiRequest<FinancialAccountResponse>(
    `/api/condominiums/${condominiumId}/financial-account`,
    {
      method: "PUT",
      body: data,
      auth: true,
    },
  );
}
