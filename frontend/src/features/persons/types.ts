export type PersonResponse = {
  id: number;
  condominiumId?: number | null;
  condominiumName: string;
  name: string;
  cpf: string;
  phoneNumber: string;
  unitCount: number;
  mainUnit: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePersonRequest = {
  name: string;
  cpf: string;
  phoneNumber: string;
};

export type UpdatePersonRequest = CreatePersonRequest;
