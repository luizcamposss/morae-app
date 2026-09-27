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

export type MercadoPagoCheckoutResponse = {
  preferenceId: string;
  checkoutUrl: string;
  initPoint: string;
  sandboxInitPoint: string;
  externalReference: string;
};
