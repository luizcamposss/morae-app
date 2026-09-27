import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  MercadoPagoCheckoutResponse,
  MercadoPagoConnectionStatus,
  MercadoPagoOAuthStartResponse,
} from "./types";

const mercadoPagoBasePath = "/api/mercadopago";

// condominiumId null/undefined = platform account (Master); a number = that condominium's account (Admin).
function buildScopeQuery(condominiumId?: number | null) {
  return condominiumId ? `?condominiumId=${condominiumId}` : "";
}

export async function getMercadoPagoConnectionStatus(
  condominiumId?: number | null,
): Promise<MercadoPagoConnectionStatus> {
  return apiRequest<MercadoPagoConnectionStatus>(
    `${mercadoPagoBasePath}/oauth/status${buildScopeQuery(condominiumId)}`,
    { auth: true },
  );
}

export async function startMercadoPagoOAuth(
  condominiumId?: number | null,
): Promise<MercadoPagoOAuthStartResponse> {
  return apiRequest<MercadoPagoOAuthStartResponse>(`${mercadoPagoBasePath}/oauth/connect`, {
    method: "POST",
    body: { condominiumId: condominiumId ?? null },
    auth: true,
  });
}

export async function completeMercadoPagoOAuth(
  code: string,
  state: string,
): Promise<MercadoPagoConnectionStatus> {
  return apiRequest<MercadoPagoConnectionStatus>(`${mercadoPagoBasePath}/oauth/complete`, {
    method: "POST",
    body: { code, state },
    auth: true,
  });
}

export async function disconnectMercadoPago(condominiumId?: number | null): Promise<void> {
  return apiRequest<void>(
    `${mercadoPagoBasePath}/oauth/connection${buildScopeQuery(condominiumId)}`,
    { method: "DELETE", auth: true },
  );
}

export async function createMercadoPagoCheckout(
  chargeId: number,
): Promise<MercadoPagoCheckoutResponse> {
  return apiRequest<MercadoPagoCheckoutResponse>(
    `/api/charges/${chargeId}/mercadopago/checkout`,
    { method: "POST", auth: true },
  );
}
