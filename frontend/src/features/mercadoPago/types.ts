import type { ChargeStatus } from "../charges/types";

export type MercadoPagoConnectionStatus = {
  isConnected: boolean;
  mercadoPagoUserId?: number | null;
  publicKey: string;
  scope: string;
  liveMode: boolean;
  expiresAt?: string | null;
  connectedAt?: string | null;
  updatedAt?: string | null;
};

export type MercadoPagoOAuthStartResponse = {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
};

export type MercadoPagoPaymentResult = {
  paymentId: number;
  status: string;
  statusDetail: string;
  paymentMethodId: string;
  paymentTypeId: string;
  chargeStatus: ChargeStatus;
  pix?: {
    qrCode: string;
    qrCodeBase64: string;
    ticketUrl: string;
    expiresAt?: string | null;
  } | null;
  boleto?: {
    url: string;
    digitableLine: string;
    expiresAt?: string | null;
  } | null;
};

export type MercadoPagoPaymentSetup = {
  chargeId: number;
  amount: number;
  description: string;
  publicKey: string;
  pendingPayment?: MercadoPagoPaymentResult | null;
};

export type MercadoPagoPaymentStatus = {
  chargeStatus: ChargeStatus;
  paymentStatus?: string | null;
};
