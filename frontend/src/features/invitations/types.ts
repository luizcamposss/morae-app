export type InvitationRole = 2 | 3 | 4;

export type InvitationStatus = 1 | 2 | 3 | 4 | 5;

export type InvitationResponse = {
  id: number;
  condominiumId: number;
  condominiumName: string;
  personId: number;
  personName: string;
  createdByUserId: number;
  email: string;
  role: InvitationRole;
  roleName: string;
  token: string;
  invitationStatus: InvitationStatus;
  statusName: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
};

export type CreateInvitationRequest = {
  condominiumId: number;
  personId: number;
  email: string;
  role: InvitationRole;
};

export type AcceptInvitationRequest = {
  token: string;
  email: string;
  password: string;
};
