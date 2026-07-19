export type OccurrenceStatus = 0 | 1 | 2 | 3;

export type OccurrencePriority = 1 | 2 | 3;

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
