import type { NewsPriority } from "./types";

// Backend Priority enum: 0 Undefined (treated as normal), 1 High, 2 Normal, 3 Low.
export const NEWS_PRIORITY = { high: 1, normal: 2, low: 3 } as const;

export const newsPriorityOptions: Array<{ value: NewsPriority; label: string; hint: string }> = [
  { value: NEWS_PRIORITY.high, label: "Importante", hint: "Aparece em destaque" },
  { value: NEWS_PRIORITY.normal, label: "Normal", hint: "Comunicado do dia a dia" },
  { value: NEWS_PRIORITY.low, label: "Informativo", hint: "Novidades e lembretes" },
];

export function newsPriorityMeta(priority: number) {
  if (priority === NEWS_PRIORITY.high) return { label: "Importante", tone: "bg-vermelho-suave text-vermelho" };
  if (priority === NEWS_PRIORITY.low) return { label: "Informativo", tone: "bg-campo text-tinta-suave" };
  return { label: "Normal", tone: "bg-verde-suave text-verde-tinta" };
}
