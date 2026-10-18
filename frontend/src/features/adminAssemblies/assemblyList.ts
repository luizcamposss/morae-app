import { formatDateTime } from "../../shared/lib/date";
import { ASSEMBLY_PHASE } from "../assemblies/assemblyMeta";
import type { AssemblyPhase, AssemblyResponse } from "../assemblies/types";

export type AssemblyFilter = "all" | "active" | "draft" | "closed" | "canceled";

const filterPhases: Record<Exclude<AssemblyFilter, "all">, AssemblyPhase[]> = {
  active: [ASSEMBLY_PHASE.open, ASSEMBLY_PHASE.scheduled],
  draft: [ASSEMBLY_PHASE.draft],
  closed: [ASSEMBLY_PHASE.closed],
  canceled: [ASSEMBLY_PHASE.canceled],
};

// Open voting first, then scheduled, drafts, closed and canceled; newest first inside each.
const phaseOrder: AssemblyPhase[] = [ASSEMBLY_PHASE.open, ASSEMBLY_PHASE.scheduled, ASSEMBLY_PHASE.draft, ASSEMBLY_PHASE.closed, ASSEMBLY_PHASE.canceled];

export function sortAssemblies(assemblies: AssemblyResponse[]) {
  return [...assemblies].sort(
    (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase) || b.votingStartsAt.localeCompare(a.votingStartsAt),
  );
}

export function filterAssemblies(assemblies: AssemblyResponse[], filter: AssemblyFilter) {
  return filter === "all" ? assemblies : assemblies.filter((assembly) => filterPhases[filter].includes(assembly.phase));
}

// One line about the voting period, in the words of each phase.
export function describeVoting(assembly: Pick<AssemblyResponse, "phase" | "votingStartsAt" | "votingEndsAt" | "closedAt" | "canceledAt">) {
  switch (assembly.phase) {
    case ASSEMBLY_PHASE.scheduled:
      return `Votação abre ${formatDateTime(assembly.votingStartsAt)}`;
    case ASSEMBLY_PHASE.open:
      return `Votação até ${formatDateTime(assembly.votingEndsAt)}`;
    case ASSEMBLY_PHASE.closed:
      return `Encerrada em ${formatDateTime(assembly.closedAt ?? assembly.votingEndsAt)}`;
    case ASSEMBLY_PHASE.canceled:
      return `Cancelada em ${formatDateTime(assembly.canceledAt)}`;
    default:
      return `Votação ${formatDateTime(assembly.votingStartsAt)} a ${formatDateTime(assembly.votingEndsAt)}`;
  }
}
