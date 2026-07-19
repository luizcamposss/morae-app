export type CondominiumResponse = {
  id: number;
  name: string;
  cnpj: string;
  number: string;
  address: string;
  city: string;
  state: string;
  emailContact: string;
  status: number;
  createdAt: string;
};

export type CreateCondominiumRequest = {
  name: string;
  cnpj: string;
  number: string;
  address: string;
  city: string;
  state: string;
  emailContact: string;
};

export type AdminOnboardingRequest = {
  name: string;
  cpf: string;
  phoneNumber: string;
  email: string;
  password: string;
};

export type CreateCondominiumOnboardingRequest = {
  condominium: CreateCondominiumRequest;
  admin: AdminOnboardingRequest;
};

export type UpdateCondominiumRequest = {
  name: string;
  number: string;
  address: string;
  city: string;
  state: string;
  emailContact: string;
  status: number;
};
