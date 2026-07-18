export type PersonResponse = {
  id: number;
  name: string;
  cpf: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePersonRequest = {
  name: string;
  cpf: string;
  phoneNumber: string;
};
