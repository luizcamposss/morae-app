export type BuildingResponse = {
  id: number;
  name: string;
  code: string;
  buildingType: string;
  floorCount: number;
  hasElevator: boolean;
  notes: string;
  condominiumId: number;
  unitCount: number;
  residentCount: number;
  occupiedUnitCount: number;
  syndicUserId: number | null;
  syndicName: string;
  syndicEmail: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBuildingRequest = {
  name: string;
  code: string;
  buildingType: string;
  floorCount: number;
  hasElevator: boolean;
  notes: string;
};
