export type OccurrenceStatus = 0 | 1 | 2 | 3 | 4;

export type OccurrencePriority = 0 | 1 | 2 | 3 | 4;

export type OccurrenceResponse = {
  id: number;
  condominiumId: number;
  unitId: number;
  createdByUserId: number;
  title: string;
  description: string;
  status: OccurrenceStatus;
  priority: OccurrencePriority;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
};

export type CreateOccurrenceRequest = {
  condominiumId: number;
  unitId: number;
  title: string;
  description: string;
  priority: OccurrencePriority;
};

export type UpdateOccurrenceStatusRequest = {
  status: OccurrenceStatus;
};
