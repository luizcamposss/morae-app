import { apiRequest } from "../../shared/lib/api/apiClient";
import type { ChargeCategory, ChargeItem, ChargeStatus } from "../charges/types";

export type InvoiceResponse = {
  chargeId: number;
  unitId: number;
  unitNumber: string;
  buildingName: string;
  // Null = everyone linked to the unit pays it; set = only this person (e.g. the tenant).
  recipientPersonId: number | null;
  recipientName: string | null;
  status: ChargeStatus;
  dueDate: string;
  value: number;
  sentAt: string | null;
  items: ChargeItem[];
};

export type InvoiceMonth = {
  condominiumId: number;
  month: string;
  defaultDueDate: string;
  autoSendDaysBefore: number | null;
  invoices: InvoiceResponse[];
};

export type AddInvoiceItemRequest = {
  unitId: number;
  recipientPersonId: number | null;
  month: string;
  category: ChargeCategory;
  description: string;
  amount: number;
};

export type InvoiceItemRequest = Pick<AddInvoiceItemRequest, "category" | "description" | "amount">;

export function getInvoiceMonth(condominiumId: number, month: string) {
  return apiRequest<InvoiceMonth>(`/api/condominiums/${condominiumId}/invoices?month=${month}`, { auth: true });
}

export function addInvoiceItem(condominiumId: number, data: AddInvoiceItemRequest) {
  return apiRequest<InvoiceResponse>(`/api/condominiums/${condominiumId}/invoices/items`, { method: "POST", body: data, auth: true });
}

export function updateInvoiceItem(itemId: number, data: InvoiceItemRequest) {
  return apiRequest<InvoiceResponse>(`/api/invoice-items/${itemId}`, { method: "PUT", body: data, auth: true });
}

export function deleteInvoiceItem(itemId: number) {
  return apiRequest<void>(`/api/invoice-items/${itemId}`, { method: "DELETE", auth: true });
}

export function updateInvoiceDueDate(chargeId: number, dueDate: string) {
  return apiRequest<InvoiceResponse>(`/api/invoices/${chargeId}`, { method: "PUT", body: { dueDate }, auth: true });
}

export function deleteInvoiceDraft(chargeId: number) {
  return apiRequest<void>(`/api/invoices/${chargeId}`, { method: "DELETE", auth: true });
}

export function sendInvoices(condominiumId: number, month: string, chargeIds?: number[]) {
  return apiRequest<{ sent: number }>(`/api/condominiums/${condominiumId}/invoices/send`, {
    method: "POST",
    body: { month, chargeIds: chargeIds ?? null },
    auth: true,
  });
}
