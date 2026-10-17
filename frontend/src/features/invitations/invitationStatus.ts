import type { InvitationResponse, InvitationRole } from "./types";

export type InvitationStatusKey = "Pending" | "Accepted" | "Refused" | "Expired" | "Canceled";

export const invitationRoleOptions: Array<{ value: InvitationRole; label: string }> = [
  { value: 4, label: "Morador" },
  { value: 3, label: "Síndico" },
];

export const INVITATION_STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "Pending", label: "Pendentes" },
  { value: "Accepted", label: "Aceitos" },
  { value: "Expired", label: "Expirados" },
  { value: "Canceled", label: "Cancelados" },
] as const;

export type InvitationStatusFilter = (typeof INVITATION_STATUS_FILTERS)[number]["value"];

const statusByCode: Record<number, InvitationStatusKey> = { 1: "Pending", 2: "Accepted", 3: "Refused", 4: "Expired", 5: "Canceled" };

const statusLabels: Record<InvitationStatusKey, string> = {
  Pending: "Pendente",
  Accepted: "Aceito",
  Refused: "Recusado",
  Expired: "Expirado",
  Canceled: "Cancelado",
};

// A pending invitation past its expiry counts as expired (the hourly job marks it later).
export function invitationStatusOf(invitation: InvitationResponse): InvitationStatusKey {
  const status = (invitation.statusName as InvitationStatusKey) || statusByCode[invitation.invitationStatus] || "Refused";
  if (status === "Pending" && new Date(invitation.expiresAt).getTime() < Date.now()) return "Expired";
  return status;
}

export function invitationStatusLabel(status: InvitationStatusKey) {
  return statusLabels[status];
}

export function invitationRoleLabel(invitation: InvitationResponse) {
  if (invitation.roleName === "Resident") return "Morador";
  if (invitation.roleName === "Syndic") return "Síndico";
  if (invitation.roleName) return invitation.roleName;
  return invitationRoleOptions.find((option) => option.value === invitation.role)?.label ?? "Não informado";
}

// Pending or accepted invitations block a new one for the same person.
export function isOpenInvitation(invitation: InvitationResponse) {
  const status = invitationStatusOf(invitation);
  return status === "Pending" || status === "Accepted";
}

export function getInvitationErrorMessage(message: string) {
  if (message.includes("Person already has a registered user") || message.includes("Esta pessoa ja possui acesso cadastrado no sistema")) {
    return "Esta pessoa já possui acesso cadastrado no sistema.";
  }
  if (message.includes("There is already a pending invitation")) return "Já existe um convite pendente para esta pessoa.";
  if (message.includes("Email already registered")) return "Este e-mail já está cadastrado.";
  if (message.includes("Expired invitations cannot be canceled")) return "Este convite já venceu. Reenvie com um novo link.";
  if (message.includes("Only expired invitations can be renewed")) return "Só dá para reenviar convites vencidos.";
  return message;
}
