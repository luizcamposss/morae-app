export type OccurrenceStatus = 0 | 1 | 2 | 3 | 4;

export type OccurrencePriority = 0 | 1 | 2 | 3 | 4;

export type OccurrenceType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type OccurrencePhoto = {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type OccurrenceResponse = {
  id: number;
  condominiumId: number;
  unitId: number;
  createdByUserId: number;
  title: string;
  description: string;
  type: OccurrenceType;
  status: OccurrenceStatus;
  priority: OccurrencePriority;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  buildingId: number;
  buildingName: string;
  unitNumber: string;
  createdByName: string;
  managementResponse?: string | null;
  respondedAt?: string | null;
  respondedByName?: string | null;
  photos: OccurrencePhoto[];
};

export type CreateOccurrenceRequest = {
  condominiumId: number;
  unitId: number;
  title: string;
  description: string;
  type: OccurrenceType;
  priority: OccurrencePriority;
};

export type UpdateOccurrenceStatusRequest = {
  status: OccurrenceStatus;
};

export type RespondOccurrenceRequest = {
  message: string;
};
