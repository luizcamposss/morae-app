export type ChargeStatus = 0 | 1 | 2 | 3 | 4;

export type ChargeScope = 1 | 2;

export type ChargeResponse = {
  id: number;
  scope: ChargeScope;
  createdByUserId: number;
  targetUserId?: number | null;
  condominiumId: number;
  unitId?: number | null;
  value: number;
  dueDate: string;
  description: string;
  cancelReason?: string | null;
  status: ChargeStatus;
  createdAt: string;
  canceledAt?: string | null;
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
