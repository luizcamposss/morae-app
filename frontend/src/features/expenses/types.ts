import type { ChargeCategory } from "../charges/types";

export type ExpenseCategory = {
  id: number;
  name: string;
  // Icon of a default category ("water", "electricity"…); null for the ones the condominium created.
  iconKey: string | null;
  expenseCount: number;
};

export type ExpenseResponse = {
  id: number;
  condominiumId: number;
  categoryId: number;
  categoryName: string;
  categoryIconKey: string | null;
  buildingId: number | null;
  buildingName: string | null;
  amount: number;
  // Calendar day "YYYY-MM-DD".
  paidOn: string;
  supplier: string | null;
  description: string | null;
  hasReceipt: boolean;
  receiptFileName: string | null;
  receiptSizeBytes: number | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveExpenseRequest = {
  categoryId: number;
  amount: number;
  paidOn: string;
  supplier: string;
  buildingId: number | null;
  description: string;
  file: File | null;
  // Edit only: drops the current receipt (ignored when a new file is sent).
  removeReceipt?: boolean;
};

export type BalanceReceipt = { expenseId: number; fileName: string; paidOn: string };

export type MonthlyBalance = {
  condominiumId: number;
  // "YYYY-MM".
  month: string;
  // False for residents: expense categories bring totals and receipts, without the items.
  isDetailed: boolean;
  incomeTotal: number;
  income: Array<{ category: ChargeCategory; label: string; total: number; paymentCount: number }>;
  expenseTotal: number;
  expenses: Array<{
    categoryId: number;
    name: string;
    iconKey: string | null;
    total: number;
    expenseCount: number;
    receipts: BalanceReceipt[];
    items: ExpenseResponse[] | null;
  }>;
  monthBalance: number;
  openingBalance: number;
  openingBalanceMonth: string | null;
  // Null when the month is before the opening balance month.
  previousBalance: number | null;
  accumulatedBalance: number | null;
};
