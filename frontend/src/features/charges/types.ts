import type { PixKeyType } from "../financialAccounts/pixKey";

// 1 Pending, 2 Paid, 3 Overdue, 4 Canceled, 5 Renegotiated (inside a debt agreement)
export type ChargeStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ChargeScope = 1 | 2;

// 1 CondominiumFee, 2 Rent, 3 Water, 4 Electricity, 5 Gas, 6 Apportionment, 7 Fine, 8 Reservation, 9 Agreement, 10 Other
export type ChargeCategory = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ChargeResponse = {
  id: number;
  scope: ChargeScope;
  createdByUserId: number;
  targetUserId?: number | null;
  condominiumId: number;
  condominiumName: string;
  unitId?: number | null;
  unitNumber?: string | null;
  buildingName?: string | null;
  value: number;
  dueDate: string;
  description: string;
  category: ChargeCategory;
  // Null = billed to everyone linked to the unit; set = only this person sees and pays it.
  recipientPersonId?: number | null;
  recipientName?: string | null;
  cancelReason?: string | null;
  status: ChargeStatus;
  createdAt: string;
  canceledAt?: string | null;
  // When the scheduled job e-mailed the "due soon" and "overdue" reminders (null = not sent).
  dueSoonReminderSentAt?: string | null;
  overdueReminderSentAt?: string | null;
  // Late fee rule copied into the charge (null = no fine/interest) and today's amounts.
  finePercent?: number | null;
  monthlyInterestPercent?: number | null;
  daysLate: number;
  fineAmount: number;
  interestAmount: number;
  updatedAmount: number;
  recurringChargeId?: number | null;
  referenceMonth?: string | null;
  // Mercado Pago connected for the receiver; without it the payer transfers by Pix and sends a receipt.
  onlinePaymentAvailable: boolean;
  pendingProofCount: number;
  latestProofStatus?: PaymentProofStatus | null;
  latestProofRejectionReason?: string | null;
  // Installment of a debt agreement (0 = down payment, 1..N = installments).
  agreementId?: number | null;
  agreementInstallmentNumber?: number | null;
  // Lines of a monthly bill (category 11); empty for other charges.
  items: ChargeItem[];
  sentAt?: string | null;
};

export type ChargeItem = {
  id: number;
  category: ChargeCategory;
  description: string;
  amount: number;
};

// 1 Pending, 2 Accepted, 3 Rejected
export type PaymentProofStatus = 1 | 2 | 3;

export type PaymentProof = {
  id: number;
  chargeId: number;
  uploadedByUserId: number;
  uploadedByName: string;
  fileName: string;
  contentType: string;
  note?: string | null;
  status: PaymentProofStatus;
  rejectionReason?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

export type ChargePixInfo = {
  chargeId: number;
  description: string;
  condominiumName: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  holderName?: string | null;
  amount: number;
};

export type CreateChargeRequest = {
  scope: ChargeScope;
  condominiumId: number;
  targetUserId?: number | null;
  unitId?: number | null;
  value: number;
  dueDate: string;
  description: string;
  category?: ChargeCategory | null;
  recipientPersonId?: number | null;
};

export type BillingSettings = {
  condominiumId: number;
  billingDueDay: number;
  lateFeeEnabled: boolean;
  finePercent: number;
  monthlyInterestPercent: number;
  maxFinePercent: number;
  maxMonthlyInterestPercent: number;
  // Monthly balance: cash at the start of openingBalanceMonth ("AAAA-MM-01"; null = from the start).
  openingBalance: number;
  openingBalanceMonth: string | null;
  // Monthly bills go out this many days before they are due; null = only by hand.
  invoiceAutoSendDaysBefore: number | null;
};

// Without openingBalance the API keeps the current one.
export type UpdateBillingSettingsRequest = Pick<BillingSettings, "billingDueDay" | "lateFeeEnabled" | "finePercent" | "monthlyInterestPercent"> &
  Partial<Pick<BillingSettings, "openingBalance" | "openingBalanceMonth" | "invoiceAutoSendDaysBefore">> & { invoiceAutoSend?: boolean };

export type ChargeUnitValue = { unitId: number; value: number };

export type CreateChargeBatchRequest = {
  buildingId?: number | null;
  value: number;
  dueDate?: string | null;
  description: string;
  category?: ChargeCategory | null;
  // Only these units (e.g. water by meter reading); empty = every unit of the target.
  unitIds?: number[] | null;
  unitValues?: ChargeUnitValue[];
};

export type SkippedUnit = { unitId: number; unitNumber: string; buildingName: string; reason: string };

export type ChargeBatchResult = {
  dueDate: string;
  createdCount: number;
  totalValue: number;
  charges: ChargeResponse[];
  skipped: SkippedUnit[];
};

// 1 Active, 2 Paused, 3 Ended
export type RecurringChargeStatus = 1 | 2 | 3;

export type RecurringChargeResponse = {
  id: number;
  condominiumId: number;
  buildingId?: number | null;
  buildingName?: string | null;
  // Set = a recurrence for this unit only, optionally for one person of it.
  unitId?: number | null;
  unitNumber?: string | null;
  recipientPersonId?: number | null;
  recipientName?: string | null;
  category: ChargeCategory;
  description: string;
  value: number;
  dueDay?: number | null;
  effectiveDueDay: number;
  status: RecurringChargeStatus;
  unitValues: Array<{ unitId: number; unitNumber: string; value: number }>;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  endedAt?: string | null;
  // Only on create/resume: the charges generated right away.
  generation?: ChargeBatchResult | null;
};

export type CreateRecurringChargeRequest = {
  buildingId?: number | null;
  value: number;
  dueDay?: number | null;
  description: string;
  category?: ChargeCategory | null;
  unitId?: number | null;
  recipientPersonId?: number | null;
  unitValues?: ChargeUnitValue[];
};
