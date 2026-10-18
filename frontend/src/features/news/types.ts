export type NewsScope = 1 | 2;

export type NewsTargetAudience = 0 | 1 | 2 | 3 | 4 | 5;

export type NewsPriority = 1 | 2 | 3;

export type NewsResponse = {
  id: number;
  userId: number;
  scope: NewsScope;
  condominiumId?: number | null;
  buildingId?: number | null;
  title: string;
  description: string;
  targetAudience: NewsTargetAudience;
  priority: NewsPriority;
  createdAt: string;
  // Only for whoever manages the notices (null for readers).
  recipientCount?: number | null;
  readCount?: number | null;
};

// Who has not opened a notice yet: only the name and the unit (privacy).
export type NewsUnreadRecipient = {
  name: string;
  buildingName?: string | null;
  unitNumber?: string | null;
};

export type CreateNewsRequest = {
  scope: NewsScope;
  condominiumId?: number | null;
  buildingId?: number | null;
  title: string;
  description: string;
  targetAudience: NewsTargetAudience;
  priority: NewsPriority;
};

export type UpdateNewsRequest = {
  buildingId?: number | null;
  title: string;
  description: string;
  targetAudience: NewsTargetAudience;
  priority: NewsPriority;
};
