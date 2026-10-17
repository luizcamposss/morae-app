import { getBuildingsByCondominium } from "../buildings/buildingService";
import { getChargesByCondominium } from "../charges/chargeService";
import { todayInputDate } from "../../shared/lib/date";

const CHARGE_STATUS_PAID = 2;
const CHARGE_STATUS_OVERDUE = 3;
const CHARGE_STATUS_CANCELED = 4;

export type CondominiumNumbers = {
  buildingCount: number;
  unitCount: number;
  occupiedUnitCount: number;
  residentCount: number;
  // Charges due this month (São Paulo), canceled ones left out.
  monthExpected: number;
  monthReceived: number;
  overdueCount: number;
  overdueValue: number;
};

// Numbers of one condominium, built from the buildings and charges it already exposes.
export async function getCondominiumNumbers(condominiumId: number): Promise<CondominiumNumbers> {
  const [buildings, charges] = await Promise.all([getBuildingsByCondominium(condominiumId), getChargesByCondominium(condominiumId)]);
  const currentMonth = todayInputDate().slice(0, 7);
  const monthCharges = charges.filter((charge) => charge.status !== CHARGE_STATUS_CANCELED && charge.dueDate.slice(0, 7) === currentMonth);
  const overdue = charges.filter((charge) => charge.status === CHARGE_STATUS_OVERDUE);

  return {
    buildingCount: buildings.length,
    unitCount: sum(buildings.map((building) => building.unitCount)),
    occupiedUnitCount: sum(buildings.map((building) => building.occupiedUnitCount)),
    residentCount: sum(buildings.map((building) => building.residentCount)),
    monthExpected: sum(monthCharges.map((charge) => charge.value)),
    monthReceived: sum(monthCharges.filter((charge) => charge.status === CHARGE_STATUS_PAID).map((charge) => charge.value)),
    overdueCount: overdue.length,
    overdueValue: sum(overdue.map((charge) => charge.value)),
  };
}

export function sumNumbers(list: CondominiumNumbers[]) {
  return {
    unitCount: sum(list.map((item) => item.unitCount)),
    occupiedUnitCount: sum(list.map((item) => item.occupiedUnitCount)),
    residentCount: sum(list.map((item) => item.residentCount)),
    monthExpected: sum(list.map((item) => item.monthExpected)),
    monthReceived: sum(list.map((item) => item.monthReceived)),
    overdueCount: sum(list.map((item) => item.overdueCount)),
    overdueValue: sum(list.map((item) => item.overdueValue)),
  };
}

export function percentOf(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
