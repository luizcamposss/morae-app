import { newsPriorityMeta } from "./newsPriority";

export function PriorityChip({ priority }: { priority: number }) {
  const meta = newsPriorityMeta(priority);
  return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>;
}
