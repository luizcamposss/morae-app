import type { ChargeCategory, ChargeStatus } from "../charges/types";

// 1 Active, 2 Completed, 3 Broken, 4 Canceled
export type AgreementStatus = 1 | 2 | 3 | 4;

// 0 None, 1 Percent, 2 Amount (in R$) — discount on the fine + interest only.
export type AgreementDiscountType = 0 | 1 | 2;

export type AgreementOriginalCharge = {
  chargeId: number;
  description: string;
  category: ChargeCategory;
  dueDate: string;
  value: number;
  fineAmount: number;
  interestAmount: number;
  status: ChargeStatus;
};

export type AgreementInstallment = {
  chargeId: number;
  // 0 = down payment.
  number: number;
  value: number;
  dueDate: string;
  status: ChargeStatus;
  daysLate: number;
  updatedAmount: number;
};

export type AgreementResponse = {
  id: number;
  condominiumId: number;
  unitId: number;
  unitNumber: string;
  buildingName: string;
  recipientPersonId?: number | null;
  recipientName?: string | null;
  status: AgreementStatus;
  originalAmount: number;
  fineAmount: number;
  interestAmount: number;
  discountType: AgreementDiscountType;
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  downPayment?: number | null;
  installmentCount: number;
  installmentDueDay: number;
  breakAfterDaysLate: number;
  notes?: string | null;
  createdAt: string;
  endedAt?: string | null;
  endReason?: string | null;
  paidCount: number;
  totalCount: number;
  paidAmount: number;
  originalCharges: AgreementOriginalCharge[];
  installments: AgreementInstallment[];
};

export type CreateAgreementRequest = {
  unitId: number;
  recipientPersonId: number | null;
  chargeIds: number[];
  discountType: AgreementDiscountType;
  discountValue: number;
  downPayment: number | null;
  downPaymentDueDate: string | null;
  installmentCount: number;
  firstInstallmentDueDate: string;
  breakAfterDaysLate: number;
  notes: string | null;
};
