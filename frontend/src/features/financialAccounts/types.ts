export type FinancialAccountResponse = {
  id: number;
  condominiumId?: number | null;
  condominiumName?: string | null;
  pixKey: string;
  updatedByUserId: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsertFinancialAccountRequest = {
  pixKey: string;
};
