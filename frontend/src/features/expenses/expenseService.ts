import { apiDownload, apiRequest } from "../../shared/lib/api/apiClient";
import type { ExpenseCategory, ExpenseResponse, MonthlyBalance, SaveExpenseRequest } from "./types";

export async function getExpenseCategories(condominiumId: number): Promise<ExpenseCategory[]> {
  return apiRequest<ExpenseCategory[]>(`/api/condominiums/${condominiumId}/expense-categories`, { auth: true });
}

export async function createExpenseCategory(condominiumId: number, name: string): Promise<ExpenseCategory> {
  return apiRequest<ExpenseCategory>(`/api/condominiums/${condominiumId}/expense-categories`, {
    method: "POST",
    body: { name },
    auth: true,
  });
}

export async function renameExpenseCategory(id: number, name: string): Promise<ExpenseCategory> {
  return apiRequest<ExpenseCategory>(`/api/expense-categories/${id}`, { method: "PUT", body: { name }, auth: true });
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  await apiRequest<void>(`/api/expense-categories/${id}`, { method: "DELETE", auth: true });
}

// month = "YYYY-MM".
export async function getExpenses(condominiumId: number, month: string): Promise<ExpenseResponse[]> {
  return apiRequest<ExpenseResponse[]>(`/api/condominiums/${condominiumId}/expenses?month=${month}`, { auth: true });
}

function toForm(data: SaveExpenseRequest) {
  const form = new FormData();
  form.append("categoryId", String(data.categoryId));
  // The API reads the amount as text with a dot ("1234.56").
  form.append("amount", data.amount.toFixed(2));
  form.append("paidOn", data.paidOn);
  form.append("supplier", data.supplier);
  form.append("description", data.description);
  if (data.buildingId) form.append("buildingId", String(data.buildingId));
  if (data.file) form.append("file", data.file);
  if (data.removeReceipt) form.append("removeReceipt", "true");
  return form;
}

export async function createExpense(condominiumId: number, data: SaveExpenseRequest): Promise<ExpenseResponse> {
  return apiRequest<ExpenseResponse>(`/api/condominiums/${condominiumId}/expenses`, { method: "POST", body: toForm(data), auth: true });
}

export async function updateExpense(id: number, data: SaveExpenseRequest): Promise<ExpenseResponse> {
  return apiRequest<ExpenseResponse>(`/api/expenses/${id}`, { method: "PUT", body: toForm(data), auth: true });
}

export async function deleteExpense(id: number): Promise<void> {
  await apiRequest<void>(`/api/expenses/${id}`, { method: "DELETE", auth: true });
}

export async function downloadExpenseReceipt(expenseId: number, fileName: string): Promise<void> {
  await apiDownload(`/api/expenses/${expenseId}/receipt`, fileName);
}

export async function getMonthlyBalance(condominiumId: number, month: string): Promise<MonthlyBalance> {
  return apiRequest<MonthlyBalance>(`/api/condominiums/${condominiumId}/monthly-balance?month=${month}`, { auth: true });
}
