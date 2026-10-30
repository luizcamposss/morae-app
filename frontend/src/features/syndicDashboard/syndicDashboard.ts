import { formatCalendarDate, parseCalendarDate, toAppDateString, todayInputDate } from "../../shared/lib/date";
import { amountDue } from "../adminPayments/chargeForm";
import type { BuildingResponse } from "../buildings/types";
import type { ChargeResponse } from "../charges/types";
import type { NewsResponse } from "../news/types";
import type { OccurrenceResponse } from "../occurrences/types";
import type { UnitResponse } from "../units/types";

const CHARGE_STATUS_OVERDUE = 3;
const OCCURRENCE_STATUS_OPEN = 1;
const OCCURRENCE_STATUS_IN_PROGRESS = 2;

// What the Início of the syndic shows; null = the syndic has no access to that area.
export type SyndicDashboardData = {
  buildings: BuildingResponse[] | null;
  charges: ChargeResponse[] | null;
  occurrences: OccurrenceResponse[] | null;
  news: NewsResponse[] | null;
  // Units of the buildings he manages, for the charges grid (finance area only).
  units: UnitResponse[] | null;
};

export const emptyDashboard: SyndicDashboardData = { buildings: null, charges: null, occurrences: null, news: null, units: null };

// "Torre A", "Torre A e Torre B" or "3 prédios".
export function describeBuildings(buildings: BuildingResponse[]) {
  if (buildings.length === 0) return "";
  if (buildings.length === 1) return buildings[0].name;
  if (buildings.length === 2) return `${buildings[0].name} e ${buildings[1].name}`;
  return `${buildings.length} prédios`;
}

export function summarizeBuildings(buildings: BuildingResponse[]) {
  return buildings.reduce(
    (total, building) => ({
      units: total.units + building.unitCount,
      occupied: total.occupied + building.occupiedUnitCount,
      residents: total.residents + building.residentCount,
    }),
    { units: 0, occupied: 0, residents: 0 },
  );
}

export function summarizeOverdue(charges: ChargeResponse[], showBuilding: boolean) {
  const overdue = charges.filter((charge) => charge.status === CHARGE_STATUS_OVERDUE);
  const unitLabels = Array.from(
    new Set(
      overdue
        .filter((charge) => charge.unitNumber)
        .map((charge) => (showBuilding && charge.buildingName ? `${charge.buildingName} ${charge.unitNumber}` : charge.unitNumber!)),
    ),
  );

  return {
    count: overdue.length,
    // Owed today, with fine and interest.
    value: overdue.reduce((total, charge) => total + amountDue(charge), 0),
    unitLabels,
  };
}

export function getOpenOccurrences(occurrences: OccurrenceResponse[]) {
  return occurrences
    .filter((occurrence) => occurrence.status === OCCURRENCE_STATUS_OPEN || occurrence.status === OCCURRENCE_STATUS_IN_PROGRESS)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function getLatestNews(news: NewsResponse[]) {
  return news.reduce<NewsResponse | null>((latest, item) => (!latest || item.createdAt > latest.createdAt ? item : latest), null);
}

// "Aptos 503 e 409", "Aptos 503, 409 e mais 2".
export function listUnits(labels: string[]) {
  if (labels.length === 0) return "";
  const prefix = labels.length === 1 ? "Apto" : "Aptos";
  if (labels.length <= 2) return `${prefix} ${labels.join(" e ")}`;
  return `${prefix} ${labels.slice(0, 2).join(", ")} e mais ${labels.length - 2}`;
}

// "hoje", "ontem" or "em 12/10/2026" for an instant, in São Paulo time.
export function describeDay(value: string) {
  const day = toAppDateString(value);
  const today = todayInputDate();
  if (day === today) return "hoje";

  const yesterday = parseCalendarDate(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (day === yesterdayKey) return "ontem";

  return `em ${formatCalendarDate(day)}`;
}

export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
