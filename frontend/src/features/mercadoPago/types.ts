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
