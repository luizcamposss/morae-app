// VisitStatus: 1 Active, 2 Canceled.
export type VisitStatus = 1 | 2;

// VisitorType: 1 Visitor, 2 ServiceProvider, 3 HouseholdStaff, 4 Other.
export type VisitorType = 1 | 2 | 3 | 4;

export type VisitResponse = {
  id: number;
  condominiumId: number;
  unitId: number | null;
  // "Torre A, unidade 101", or null for a visit of the condominium.
  unitLabel: string | null;
  buildingId: number | null;
  visitorName: string;
  visitorType: VisitorType;
  documentLastDigits: string | null;
  companyName: string | null;
  notes: string | null;
  // Calendar dates, "yyyy-MM-dd".
  startDate: string;
  endDate: string;
  // 0 = Sunday ... 6 = Saturday. Empty = every day of the period.
  daysOfWeek: number[];
  // "HH:mm", or null for the whole day.
  startTime: string | null;
  endTime: string | null;
  status: VisitStatus;
  createdByName: string;
  createdAt: string;
  // Agenda only: the days of the requested period on which the visit happens.
  dates: string[] | null;
};

export type SaveVisitRequest = {
  unitId: number | null;
  visitorName: string;
  visitorType: VisitorType;
  documentLastDigits: string | null;
  companyName: string | null;
  notes: string | null;
  startDate: string;
  endDate: string | null;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
};

export type VisitAgendaFilters = {
  from: string;
  to: string;
  buildingId?: number | null;
  unitId?: number | null;
  visitorType?: VisitorType | null;
  includeCanceled?: boolean;
};
