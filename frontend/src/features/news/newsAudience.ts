import type { NewsTargetAudience } from "./types";

// Backend NewsTargetAudience enum: 1 Everyone, 2 Admins, 3 Syndics, 4 Residents, 5 Doormen.
export const NEWS_AUDIENCE = { everyone: 1, admins: 2, syndics: 3, residents: 4, doormen: 5 } as const;

const audienceLabels: Record<number, string> = {
  [NEWS_AUDIENCE.everyone]: "Todos",
  [NEWS_AUDIENCE.admins]: "Administração",
  [NEWS_AUDIENCE.syndics]: "Síndicos",
  [NEWS_AUDIENCE.residents]: "Moradores",
  [NEWS_AUDIENCE.doormen]: "Portaria",
};

// What a condominium manager picks when writing a notice.
export const condominiumAudienceOptions: Array<{ value: NewsTargetAudience; label: string }> = [
  { value: NEWS_AUDIENCE.everyone, label: "Todos" },
  { value: NEWS_AUDIENCE.residents, label: "Moradores" },
  { value: NEWS_AUDIENCE.syndics, label: "Síndicos" },
];

export function newsAudienceLabel(audience: number) {
  return audienceLabels[audience] ?? "Todos";
}
