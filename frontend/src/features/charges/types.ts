export type ChargeStatus = 0 | 1 | 2 | 3 | 4;

export type ChargeScope = 1 | 2;

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
  cancelReason?: string | null;
  status: ChargeStatus;
  createdAt: string;
  canceledAt?: string | null;
  // Late fee rule copied into the charge (null = no fine/interest) and today's amounts.
  finePercent?: number | null;
  monthlyInterestPercent?: number | null;
  daysLate: number;
  fineAmount: number;
  interestAmount: number;
  updatedAmount: number;
  recurringChargeId?: number | null;
  referenceMonth?: string | null;
};

export type CreateChargeRequest = {
  scope: ChargeScope;
  condominiumId: number;
  targetUserId?: number | null;
  unitId?: number | null;
  value: number;
  dueDate: string;
  description: string;
};

export type BillingSettings = {
  condominiumId: number;
  billingDueDay: number;
  lateFeeEnabled: boolean;
  finePercent: number;
  monthlyInterestPercent: number;
  maxFinePercent: number;
  maxMonthlyInterestPercent: number;
};

export type UpdateBillingSettingsRequest = Pick<BillingSettings, "billingDueDay" | "lateFeeEnabled" | "finePercent" | "monthlyInterestPercent">;

export type ChargeUnitValue = { unitId: number; value: number };

export type CreateChargeBatchRequest = {
  buildingId?: number | null;
  value: number;
  dueDate?: string | null;
  description: string;
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
  unitValues?: ChargeUnitValue[];
};
