import { formatDate, formatTime, toAppDateString, todayInputDate } from "../../shared/lib/date";
import type { LandingContactProfile, LandingContactResponse, LandingContactStatus } from "./types";

export const CONTACT_STATUS = {
  new: 1,
  inConversation: 2,
  closed: 3,
  notInterested: 4,
} as const satisfies Record<string, LandingContactStatus>;

// `label` names one contact; `tab` names the filter (plural).
export const contactStatuses: Array<{ value: LandingContactStatus; label: string; tab: string; tone: string }> = [
  { value: CONTACT_STATUS.new, label: "Novo", tab: "Novos", tone: "bg-ambar-suave text-ambar" },
  { value: CONTACT_STATUS.inConversation, label: "Em conversa", tab: "Em conversa", tone: "bg-menu text-tinta" },
  { value: CONTACT_STATUS.closed, label: "Fechado", tab: "Fechados", tone: "bg-verde-suave text-verde-tinta" },
  { value: CONTACT_STATUS.notInterested, label: "Sem interesse", tab: "Sem interesse", tone: "bg-menu text-tinta-suave" },
];

export function contactStatusInfo(status: LandingContactStatus) {
  return contactStatuses.find((item) => item.value === status) ?? contactStatuses[0];
}

export function profileLabel(profile: LandingContactProfile) {
  if (profile === 1) return "Administrador(a)";
  if (profile === 2) return "Síndico(a)";
  return "Perfil não informado";
}

export function unitCountLabel(count: number) {
  return `${count.toLocaleString("pt-BR")} unidade${count === 1 ? "" : "s"}`;
}

// "5511999990000" -> "+55 (11) 99999-0000". Same rule as the Master e-mail; other countries stay "+<digits>".
export function formatWhatsApp(digits: string) {
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const area = digits.slice(2, 4);
    const number = digits.slice(4);
    const split = number.length - 4;
    return `+55 (${area}) ${number.slice(0, split)}-${number.slice(split)}`;
  }

  return `+${digits}`;
}

// When the contact arrived, in São Paulo time: "hoje, 16:40", "ontem, 09:12" or "20/10/2026, 18:05".
export function arrivedLabel(createdAt: string) {
  const day = toAppDateString(createdAt);
  const today = todayInputDate();
  // Noon of today in São Paulo minus one day always lands on yesterday there.
  const yesterday = toAppDateString(new Date(Date.parse(`${today}T12:00:00-03:00`) - 86_400_000));
  const time = formatTime(createdAt);

  if (day === today) return `hoje, ${time}`;
  if (day === yesterday) return `ontem, ${time}`;
  return `${formatDate(createdAt)}, ${time}`;
}

// The first message carried by the wa.me link (its `text` parameter).
export function readyMessage(contact: LandingContactResponse) {
  try {
    return new URL(contact.whatsAppUrl).searchParams.get("text") ?? "";
  } catch {
    return "";
  }
}
