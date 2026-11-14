import { categoryLabel } from "./chargeCategories";
import type { ChargeCategory } from "./types";

// Neutral tag: the category says what the charge is for, not whether it is paid (green/red stay for status).
export function ChargeCategoryChip({ category }: { category: ChargeCategory | null | undefined }) {
  return <span className="shrink-0 rounded-chip bg-campo px-2 py-0.5 text-xs font-semibold text-tinta">{categoryLabel(category)}</span>;
}
