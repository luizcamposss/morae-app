export type MeResponse = {
  userId: number;
  email: string;
  userName: string;
  personId: number;
  personName: string;
  roles: string[];
};

export type MeCondominiumResponse = {
  condominiumId: number;
  condominiumName: string;
  role: string;
  status: string;
};
