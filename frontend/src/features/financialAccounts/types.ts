export type FinancialAccountScope = 1 | 2;

export type BankAccountType = 1 | 2 | 3;

export type PixKeyType = 1 | 2 | 3 | 4 | 5;

export type FinancialAccountResponse = {
  id: number;
  scope: FinancialAccountScope;
  condominiumId?: number | null;
  condominiumName?: string | null;
  holderName: string;
  holderDocument: string;
  bankName: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit?: string | null;
  accountType: BankAccountType;
  pixKeyType: PixKeyType;
  pixKey: string;
  updatedByUserId: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsertFinancialAccountRequest = {
  holderName: string;
  holderDocument: string;
  bankName: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit?: string | null;
  accountType: BankAccountType;
  pixKeyType: PixKeyType;
  pixKey: string;
};
