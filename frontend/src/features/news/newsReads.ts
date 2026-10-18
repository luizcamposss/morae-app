import type { NewsResponse, NewsUnreadRecipient } from "./types";

// "12 avisados · 8 leram". Null for readers (no counts) and for notices published before
// reads were saved (nobody on record).
export function newsReadSummary(news: NewsResponse) {
  const total = news.recipientCount ?? 0;
  if (total === 0) return null;
  const read = news.readCount ?? 0;
  return `${total} ${total === 1 ? "avisado" : "avisados"} · ${read} ${read === 1 ? "leu" : "leram"}`;
}

export type UnreadUnit = { label: string; names: string[] };

// One line per unit ("Torre A · 101"), people without a unit last.
export function groupUnreadByUnit(people: NewsUnreadRecipient[]): UnreadUnit[] {
  const groups = new Map<string, string[]>();

  for (const person of people) {
    const label = person.unitNumber ? [person.buildingName, person.unitNumber].filter(Boolean).join(" · ") : "Sem unidade";
    groups.set(label, [...(groups.get(label) ?? []), person.name]);
  }

  return [...groups].map(([label, names]) => ({ label, names }));
}
