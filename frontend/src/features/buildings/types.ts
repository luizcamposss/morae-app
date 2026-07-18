export type BuildingResponse = {
  id: number;
  name: string;
  code: string;
  condominiumId: number;
  unitCount: number;
  residentCount: number;
  occupiedUnitCount: number;
  status: string;
  createdAt: string;
};

export type CreateBuildingRequest = {
  name: string;
  code: string;
};
