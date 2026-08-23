import { apiRequest } from "../../shared/lib/api/apiClient";
import type {
  MercadoPagoConnectionStatus,
  MercadoPagoOAuthStartResponse,
} from "./types";

const mercadoPagoBasePath = "/api/mercadopago";

export async function getMercadoPagoConnectionStatus(): Promise<MercadoPagoConnectionStatus> {
  return apiRequest<MercadoPagoConnectionStatus>(`${mercadoPagoBasePath}/oauth/status`, {
    auth: true,
  });
}

export async function startMercadoPagoOAuth(): Promise<MercadoPagoOAuthStartResponse> {
  return apiRequest<MercadoPagoOAuthStartResponse>(`${mercadoPagoBasePath}/oauth/connect`, {
    method: "POST",
    auth: true,
  });
}
