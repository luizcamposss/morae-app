import type { PixKeyType } from "./pixKey";

export type FinancialAccountResponse = {
  id: number;
  condominiumId?: number | null;
  condominiumName?: string | null;
  pixKeyType: PixKeyType;
  pixKey: string;
  updatedByUserId: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsertFinancialAccountRequest = {
  pixKeyType: PixKeyType;
  pixKey: string;
};
