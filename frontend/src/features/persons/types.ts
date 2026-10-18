export type PersonResponse = {
  id: number;
  condominiumId?: number | null;
  userId?: number | null;
  condominiumName: string;
  name: string;
  cpf: string;
  phoneNumber: string;
  email?: string | null;
  hasRegisteredUser: boolean;
  accessRole: PersonAccessRole | "";
  unitCount: number;
  mainUnit: string;
  createdAt: string;
  updatedAt: string;
};

export type PersonAccessRole = "Resident" | "Syndic";

export type CreatePersonRequest = {
  name: string;
  cpf: string;
  phoneNumber: string;
  email?: string | null;
};

export type UpdatePersonRequest = CreatePersonRequest;
