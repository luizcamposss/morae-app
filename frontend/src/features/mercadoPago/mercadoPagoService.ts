import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  MercadoPagoConnectionStatus,
  MercadoPagoOAuthStartResponse,
  MercadoPagoPaymentResult,
  MercadoPagoPaymentSetup,
  MercadoPagoPaymentStatus,
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

export async function getMercadoPagoPaymentSetup(
  chargeId: number,
): Promise<MercadoPagoPaymentSetup> {
  return apiRequest<MercadoPagoPaymentSetup>(`/api/charges/${chargeId}/mercadopago/payment-setup`, {
    auth: true,
  });
}

// formData is forwarded as the Payment Brick produced it; the backend ignores any amount
// in it and charges the value stored for the charge.
export async function createMercadoPagoPayment(
  chargeId: number,
  formData: unknown,
): Promise<MercadoPagoPaymentResult> {
  return apiRequest<MercadoPagoPaymentResult>(`/api/charges/${chargeId}/mercadopago/payments`, {
    method: "POST",
    body: formData,
    auth: true,
  });
}

export async function getMercadoPagoPaymentStatus(
  chargeId: number,
): Promise<MercadoPagoPaymentStatus> {
  return apiRequest<MercadoPagoPaymentStatus>(`/api/charges/${chargeId}/mercadopago/payment-status`, {
    auth: true,
  });
}

export async function refundMercadoPagoPayment(chargeId: number): Promise<void> {
  return apiRequest<void>(`/api/charges/${chargeId}/mercadopago/refund`, {
    method: "POST",
    auth: true,
  });
}
