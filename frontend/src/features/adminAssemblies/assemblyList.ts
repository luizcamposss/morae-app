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
