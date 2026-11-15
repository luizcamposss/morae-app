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
  // True when every active link of the user points to an inactive condominium (Master excluded).
  isCondominiumInactive: boolean;
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
  // 1 Residential, 2 Rental, 3 Mixed (features/modules).
  type: number;
  enabledModules: string[];
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
