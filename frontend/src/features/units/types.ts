export type UnitResponse = {
  id: number;
  buildingId: number;
  condominiumId: number;
  buildingName: string;
  number: string;
  unitType: number;
  rooms: number;
  bathrooms: number;
  squareMeters: number;
  observations: string;
  residentCount: number;
  responsiblePersonName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateUnitRequest = {
  number: string;
  unitType: number;
  rooms: number;
  bathrooms: number;
  squareMeters: number;
  observations: string;
};
