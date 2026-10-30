export type UserCondominiumStatus = 1 | 2;

export type MasterUserResponse = {
  userId: number;
  personId: number;
  personName: string;
  email: string;
  condominiumId: number;
  condominiumName: string;
  role: string;
  status: UserCondominiumStatus;
  accessCreatedAt: string;
  userCreatedAt: string;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
};

export type SuspendUserRequest = {
  suspensionReason?: string;
};
