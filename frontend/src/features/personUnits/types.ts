export type PersonUnitResponse = {
  id: number;
  personId: number;
  personName: string;
  unitId: number;
  unitNumber: string;
  relationshipType: number;
  createdAt: string;
};

export type CreatePersonUnitRequest = {
  personId: number;
  relationshipType: number;
};
