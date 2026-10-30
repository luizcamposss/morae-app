import { getMaintenancePlans } from "../maintenance/maintenanceService";
import type { MaintenancePlanResponse } from "../maintenance/types";
import { getOccurrencesByCondominium } from "../occurrences/occurrenceService";
import type { OccurrenceResponse } from "../occurrences/types";
import { addDays } from "../visits/visitMeta";
import type { VisitResponse } from "../visits/types";
import { getVisitAgenda } from "../visits/visitService";
import { VISIT_CHUNK_DAYS } from "./agendaMeta";

// Data that does not depend on the period: fetched once per condominium. Each module the
// user cannot see is skipped; a module that fails comes back empty with its error.
export async function loadAgendaSources(condominiumId: number, modules: { maintenance: boolean; occurrence: boolean }) {
  const [plans, occurrences] = await Promise.allSettled([
    modules.maintenance ? getMaintenancePlans(condominiumId) : Promise.resolve<MaintenancePlanResponse[]>([]),
    modules.occurrence ? getOccurrencesByCondominium(condominiumId) : Promise.resolve<OccurrenceResponse[]>([]),
  ]);

  return {
    plans: plans.status === "fulfilled" ? plans.value : [],
    occurrences: occurrences.status === "fulfilled" ? occurrences.value : [],
    failed: [plans, occurrences].some((result) => result.status === "rejected"),
  };
}

// Visits of the period, split in blocks of up to 31 days (the agenda limit). Each block only
// returns the dates inside it, so the blocks never repeat a day.
export async function loadAgendaVisits(condominiumId: number, from: string, to: string): Promise<VisitResponse[]> {
  const requests: Promise<VisitResponse[]>[] = [];

  for (let start = from; start <= to; start = addDays(start, VISIT_CHUNK_DAYS)) {
    const end = addDays(start, VISIT_CHUNK_DAYS - 1);
    requests.push(getVisitAgenda(condominiumId, { from: start, to: end < to ? end : to }));
  }

  return (await Promise.all(requests)).flat();
}
