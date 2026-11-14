// ReservationStatus: 1 Pending, 2 Approved, 3 Rejected, 4 Canceled.
export type ReservationStatus = 1 | 2 | 3 | 4;

export type CommonAreaShift = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

export type CommonAreaResponse = {
  id: number;
  condominiumId: number;
  buildingId: number | null;
  buildingName: string | null;
  name: string;
  description: string | null;
  capacity: number | null;
  isActive: boolean;
  fullDay: boolean;
  shifts: CommonAreaShift[];
  minAdvanceDays: number;
  maxAdvanceDays: number;
  monthlyLimitPerUnit: number | null;
  requiresApproval: boolean;
  fee: number | null;
  freeCancellationDays: number | null;
  terms: string | null;
  hasPhoto: boolean;
  pendingCount: number;
};

export type SaveCommonAreaRequest = {
  name: string;
  description: string | null;
  capacity: number | null;
  buildingId: number | null;
  isActive: boolean;
  fullDay: boolean;
  shifts: Array<{ id?: number; name: string; startTime: string; endTime: string }>;
  minAdvanceDays: number;
  maxAdvanceDays: number;
  monthlyLimitPerUnit: number | null;
  requiresApproval: boolean;
  fee: number | null;
  freeCancellationDays: number | null;
  terms: string | null;
};

export type AvailabilitySlot = {
  shiftId: number | null;
  name: string;
  startTime: string | null;
  endTime: string | null;
  isFree: boolean;
  isMine: boolean;
};

export type AvailabilityDay = {
  date: string;
  inWindow: boolean;
  slots: AvailabilitySlot[];
};

export type CommonAreaAvailability = {
  commonAreaId: number;
  unitId: number;
  firstBookableDate: string;
  lastBookableDate: string;
  monthlyLimitPerUnit: number | null;
  usedInMonth: number;
  days: AvailabilityDay[];
};

export type CreateReservationRequest = {
  commonAreaId: number;
  unitId: number;
  date: string;
  shiftId: number | null;
  acceptTerms: boolean;
  notes: string | null;
};

export type ReservationResponse = {
  id: number;
  condominiumId: number;
  commonAreaId: number;
  commonAreaName: string;
  unitId: number;
  unitLabel: string;
  buildingId: number;
  date: string;
  shiftId: number | null;
  shiftName: string;
  startTime: string | null;
  endTime: string | null;
  status: ReservationStatus;
  notes: string | null;
  fee: number | null;
  chargeId: number | null;
  // ChargeStatus: 1 Pending, 2 Paid, 3 Overdue, 4 Canceled.
  chargeStatus: number | null;
  requestedByName: string;
  createdAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  freeCancellationUntil: string | null;
  canCancel: boolean;
};

export type ReservationFilters = {
  from?: string;
  to?: string;
  status?: ReservationStatus;
  commonAreaId?: number;
};
