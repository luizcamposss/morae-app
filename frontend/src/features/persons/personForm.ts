import type { CreatePersonRequest, PersonResponse } from "./types";

export const emptyPersonForm: CreatePersonRequest = { name: "", cpf: "", phoneNumber: "" };

export const PERSON_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "linked", label: "Com unidade" },
  { value: "unlinked", label: "Sem unidade" },
  { value: "noAccess", label: "Sem acesso" },
] as const;

export type PersonFilter = (typeof PERSON_FILTERS)[number]["value"];

export function matchesPersonFilter(person: PersonResponse, filter: PersonFilter) {
  if (filter === "linked") return person.unitCount > 0;
  if (filter === "unlinked") return person.unitCount === 0;
  if (filter === "noAccess") return !person.hasRegisteredUser;
  return true;
}

export function toPersonForm(person: PersonResponse): CreatePersonRequest {
  return { name: person.name, cpf: person.cpf, phoneNumber: person.phoneNumber };
}

export function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

// Returns the first problem with the form, or "" when it can be sent.
export function validatePersonForm(form: CreatePersonRequest) {
  if (form.name.trim().length < 2) return "Informe o nome completo do morador.";
  if (form.cpf.length !== 11) return "Informe um CPF válido com 11 números.";
  if (form.phoneNumber.length < 10) return "Informe um telefone válido com DDD.";
  return "";
}

export function getPersonErrorMessage(message: string) {
  if (message.includes("CPF already registered")) return "Este CPF já está cadastrado no sistema.";
  if (message.includes("CPF must contain exactly 11 digits")) return "Informe um CPF válido com 11 números.";
  if (message.includes("Phone number must contain between 10 and 20 digits")) return "Informe um telefone válido com DDD.";
  if (message.includes("Erro ao comunicar com a API. Status 400")) return "Revise os dados informados antes de cadastrar o morador.";
  return message;
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : value || "Não informado";
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return value || "Não informado";
}

export function accessRoleLabel(person: PersonResponse) {
  if (person.accessRole === "Syndic") return "Síndico";
  if (person.accessRole === "Resident") return "Morador";
  return "";
}

export function initialsOf(name: string) {
  // Only words that start with a letter (skips prefixes like "[T82]").
  const parts = name.trim().split(/\s+/).filter((part) => /^\p{L}/u.test(part));
  if (parts.length === 0) return "?";
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}
