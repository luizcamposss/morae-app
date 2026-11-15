export type CondominiumResponse = {
  id: number;
  name: string;
  cnpj: string;
  cep: string;
  number: string;
  address: string;
  city: string;
  state: string;
  emailContact: string;
  status: number;
  // 1 Residential, 2 Rental, 3 Mixed (features/modules).
  type: number;
  adminUserId?: number | null;
  adminName?: string | null;
  adminEmail?: string | null;
  createdAt: string;
};

export type CreateCondominiumRequest = {
  name: string;
  cnpj: string;
  cep: string;
  number: string;
  address: string;
  city: string;
  state: string;
  emailContact: string;
  type: number;
};

export type AdminOnboardingRequest = {
  name: string;
  cpf: string;
  phoneNumber: string;
  email: string;
};

export type CreateCondominiumOnboardingRequest = {
  condominium: CreateCondominiumRequest;
  admin: AdminOnboardingRequest;
};

export type UpdateCondominiumRequest = {
  name: string;
  cep: string;
  number: string;
  address: string;
  city: string;
  state: string;
  emailContact: string;
  status: number;
  // A new type resets the condominium's modules to that type's defaults.
  type: number;
};

export type UpdateCondominiumStatusRequest = {
  status: number;
};

export type UpdateCondominiumAdminRequest = {
  adminUserId: number;
};
