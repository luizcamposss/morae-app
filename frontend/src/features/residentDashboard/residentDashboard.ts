import { ASSEMBLY_PHASE } from "../assemblies/assemblyMeta";
import type { AssemblyResponse } from "../assemblies/types";
import type { ChargeResponse } from "../charges/types";
import type { DocumentResponse } from "../documents/types";
import type { NewsResponse } from "../news/types";
import { addDays, VISIT_STATUS } from "../visits/visitMeta";
import type { VisitResponse } from "../visits/types";
import { toAppDateString } from "../../shared/lib/date";

const NEW_DOCUMENT_DAYS = 30;
const LIST_SIZE = 3;

// What the Início of the resident shows; null = that list could not be loaded.
export type ResidentDashboardData = {
  charges: ChargeResponse[];
  assemblies: AssemblyResponse[] | null;
  news: NewsResponse[] | null;
  documents: DocumentResponse[] | null;
  visits: VisitResponse[] | null;
};

export const emptyResidentDashboard: ResidentDashboardData = { charges: [], assemblies: null, news: null, documents: null, visits: null };

// The assembly with voting open that closes first.
export function getOpenAssembly(assemblies: AssemblyResponse[]) {
  return assemblies
    .filter((assembly) => assembly.phase === ASSEMBLY_PHASE.open)
    .sort((a, b) => a.votingEndsAt.localeCompare(b.votingEndsAt))[0];
}

export function getLatestNews(news: NewsResponse[]) {
  return [...news].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, LIST_SIZE);
}

// Documents published in the last 30 days, newest first.
export function getNewDocuments(documents: DocumentResponse[], today: string) {
  const since = addDays(today, -NEW_DOCUMENT_DAYS);
  return documents
    .filter((document) => toAppDateString(document.createdAt) >= since)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, LIST_SIZE);
}

// Active visits that still happen from today on, by the next day they happen.
export function getUpcomingVisits(visits: VisitResponse[], today: string) {
  return visits
    .filter((visit) => visit.status === VISIT_STATUS.active && visit.endDate >= today)
    .map((visit) => ({ visit, nextDate: visit.startDate > today ? visit.startDate : today }))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || (a.visit.startTime ?? "").localeCompare(b.visit.startTime ?? ""))
    .slice(0, LIST_SIZE);
}
