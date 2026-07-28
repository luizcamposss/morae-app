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
