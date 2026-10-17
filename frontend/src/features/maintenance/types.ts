// MaintenanceCategory: 1 Elevator, 2 FireSafety, 3 WaterTank, 4 PestControl, 5 Electrical,
// 6 Equipment, 7 Structure, 8 Pool, 9 Other.
export type MaintenanceCategory = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// MaintenanceStatus: 1 UpToDate, 2 DueSoon (30 days or less), 3 Overdue.
export type MaintenanceStatus = 1 | 2 | 3;

export type MaintenancePlanResponse = {
  id: number;
  condominiumId: number;
  buildingId: number | null;
  buildingName: string | null;
  name: string;
  category: MaintenanceCategory;
  intervalMonths: number;
  // Calendar dates: "yyyy-MM-dd".
  nextDueDate: string;
  status: MaintenanceStatus;
  // Negative when overdue.
  daysUntilDue: number;
  lastPerformedOn: string | null;
  providerName: string | null;
  providerPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveMaintenancePlanRequest = {
  buildingId: number | null;
  name: string;
  category: MaintenanceCategory;
  intervalMonths: number;
  nextDueDate: string;
  providerName: string | null;
  providerPhone: string | null;
  notes: string | null;
};

export type MaintenanceRecordResponse = {
  id: number;
  maintenancePlanId: number;
  performedOn: string;
  providerName: string | null;
  notes: string | null;
  hasAttachment: boolean;
  attachmentFileName: string | null;
  attachmentSizeBytes: number | null;
  registeredByName: string;
  createdAt: string;
};

export type CreateMaintenanceRecordRequest = {
  performedOn: string;
  providerName: string;
  notes: string;
  file: File | null;
};
