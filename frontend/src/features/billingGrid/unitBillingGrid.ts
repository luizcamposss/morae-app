import { parseCalendarDate, todayInputDate } from "../../shared/lib/date";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import type { UnitResponse } from "../units/types";

export type UnitBillingStatus = "paid" | "dueSoon" | "overdue" | "open" | "none";

export type GridUnit = { id: number; number: string; status: UnitBillingStatus };
export type GridFloor = { floor: number | null; units: GridUnit[] };
export type GridBuilding = { id: number; name: string; floors: GridFloor[]; total: number; upToDate: number };

export const STATUS_ORDER: UnitBillingStatus[] = ["paid", "dueSoon", "overdue", "open", "none"];

const DUE_SOON_DAYS = 7;

// "YYYY-MM-DD" of today + days, in São Paulo.
function shiftDay(day: string, days: number) {
  const date = parseCalendarDate(day);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// The unit's color in the month: any overdue charge (any month) wins, so "em dia" matches the
// existing count (units without overdue charges). Then this month's charges: paid, due in the
// next 7 days, open, or none.
export function buildUnitStatuses(charges: ChargeResponse[]) {
  const today = todayInputDate();
  const month = today.slice(0, 7);
  const soonLimit = shiftDay(today, DUE_SOON_DAYS - 1);
  const byUnit = new Map<number, UnitBillingStatus>();
  const rank: Record<UnitBillingStatus, number> = { overdue: 4, dueSoon: 3, open: 2, paid: 1, none: 0 };

  for (const charge of charges) {
    if (!charge.unitId || charge.scope !== 2 || charge.status === CHARGE_STATUS.canceled) continue;
    let status: UnitBillingStatus | null = null;

    if (charge.status === CHARGE_STATUS.overdue) status = "overdue";
    else if (charge.dueDate.startsWith(month)) {
      if (charge.status === CHARGE_STATUS.paid) status = "paid";
      else status = charge.dueDate.slice(0, 10) <= soonLimit ? "dueSoon" : "open";
    }

    if (status && rank[status] > rank[byUnit.get(charge.unitId) ?? "none"]) byUnit.set(charge.unitId, status);
  }

  return byUnit;
}

// Floor from numbers like "101", "1203" or "A-704" (hundreds = floor); null when it cannot tell.
function floorOf(number: string) {
  const digits = number.match(/(\d{3,4})\D*$/)?.[1];
  return digits ? Number(digits.slice(0, -2)) : null;
}

const byNumber = (a: GridUnit, b: GridUnit) => a.number.localeCompare(b.number, "pt-BR", { numeric: true });

// Units grouped by building and, when every number shows its floor, by floor (top floor first).
export function buildBillingGrid(units: UnitResponse[], statuses: Map<number, UnitBillingStatus>): GridBuilding[] {
  const buildings = new Map<number, { name: string; units: GridUnit[] }>();

  for (const unit of units) {
    const building = buildings.get(unit.buildingId) ?? { name: unit.buildingName, units: [] };
    building.units.push({ id: unit.id, number: unit.number, status: statuses.get(unit.id) ?? "none" });
    buildings.set(unit.buildingId, building);
  }

  return [...buildings.entries()]
    .map(([id, building]) => {
      const sorted = [...building.units].sort(byNumber);
      const floors = sorted.map((unit) => floorOf(unit.number));
      let grouped: GridFloor[];

      if (sorted.length > 0 && floors.every((floor) => floor !== null)) {
        const byFloor = new Map<number, GridUnit[]>();
        sorted.forEach((unit, index) => byFloor.set(floors[index]!, [...(byFloor.get(floors[index]!) ?? []), unit]));
        grouped = [...byFloor.entries()].sort((a, b) => b[0] - a[0]).map(([floor, list]) => ({ floor, units: list }));
      } else {
        grouped = [{ floor: null, units: sorted }];
      }

      return {
        id,
        name: building.name,
        floors: grouped,
        total: sorted.length,
        upToDate: sorted.filter((unit) => unit.status !== "overdue").length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
}
