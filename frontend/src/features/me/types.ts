export type MeResponse = {
  userId: number;
  email: string;
  userName: string;
  personId: number;
  personName: string;
  phoneNumber: string;
  profilePhotoUrl?: string | null;
  isSuspended: boolean;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  roles: string[];
};

export type UpdateMyProfileRequest = {
  name: string;
  phoneNumber: string;
};

export type NotificationPreferences = {
  noticesEnabled: boolean;
  billsEnabled: boolean;
  unitUpdatesEnabled: boolean;
};

export type MeCondominiumResponse = {
  condominiumId: number;
  condominiumName: string;
  role: string;
  status: string;
};

export type MeUnitResponse = {
  unitId: number;
  buildingId: number;
  condominiumId: number;
  unitNumber: string;
  buildingName: string;
  condominiumName: string;
  unitType: number;
  relationshipType: number;
};
