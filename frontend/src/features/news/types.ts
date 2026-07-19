export type NewsScope = 1 | 2;

export type NewsTargetAudience = 1 | 2 | 3;

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
