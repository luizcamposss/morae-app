import { ArrowUpDown, BrickWall, Bug, Cog, Droplets, FireExtinguisher, Waves, Wrench, Zap, type LucideIcon } from "lucide-react";
import { todayInputDate } from "../../shared/lib/date";
import type { MaintenanceCategory, MaintenancePlanResponse, MaintenanceStatus, SaveMaintenancePlanRequest } from "./types";

export const MAINTENANCE_STATUS = { upToDate: 1, dueSoon: 2, overdue: 3 } as const;

// Limits from MaintenancePlanService.
export const NAME_MAX = 150;
export const NOTES_MAX = 1000;
export const INTERVAL_MAX = 120;
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx";

export const maintenanceCategories: Record<MaintenanceCategory, { label: string; icon: LucideIcon }> = {
  1: { label: "Elevador", icon: ArrowUpDown },
  2: { label: "Incêndio", icon: FireExtinguisher },
  3: { label: "Caixa d'água", icon: Droplets },
  4: { label: "Dedetização", icon: Bug },
  5: { label: "Elétrica", icon: Zap },
  6: { label: "Equipamentos", icon: Cog },
  7: { label: "Estrutura", icon: BrickWall },
  8: { label: "Piscina", icon: Waves },
  9: { label: "Outra", icon: Wrench },
};

export const categoryOptions = Object.entries(maintenanceCategories).map(([value, meta]) => ({ value, label: meta.label }));

export const maintenanceStatuses: Record<MaintenanceStatus, { label: string; tone: string }> = {
  1: { label: "Em dia", tone: "bg-verde-suave text-verde-tinta" },
  2: { label: "Vence em breve", tone: "bg-ambar-suave text-ambar" },
  3: { label: "Atrasada", tone: "bg-vermelho-suave text-vermelho" },
};

// "Atrasada há 5 dias", "Vence amanhã", "Em dia · 4 meses".
export function dueLabel(plan: Pick<MaintenancePlanResponse, "status" | "daysUntilDue">) {
  const days = plan.daysUntilDue;

  if (plan.status === MAINTENANCE_STATUS.overdue) {
    const late = Math.abs(days);
    return late === 1 ? "Atrasada há 1 dia" : `Atrasada há ${late} dias`;
  }
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  if (plan.status === MAINTENANCE_STATUS.dueSoon) return `Vence em ${days} dias`;
  if (days < 60) return `Em dia · ${days} dias`;
  return `Em dia · ${Math.floor(days / 30)} meses`;
}

// 1 → "mensal", 6 → "semestral", 36 → "a cada 3 anos".
export function intervalLabel(months: number) {
  const names: Record<number, string> = { 1: "mensal", 2: "bimestral", 3: "trimestral", 4: "quadrimestral", 6: "semestral", 12: "anual" };
  if (names[months]) return names[months];
  if (months % 12 === 0) return `a cada ${months / 12} anos`;
  return `a cada ${months} meses`;
}

export function scopeLabel(plan: Pick<MaintenancePlanResponse, "buildingName">) {
  return plan.buildingName ?? "Condomínio inteiro";
}

// "11987654321" → "(11) 98765-4321"; other lengths stay as typed.
export function formatPhone(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value ?? "";
}

export function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export type PlanForm = {
  name: string;
  category: string;
  buildingId: string;
  intervalMonths: string;
  nextDueDate: string;
  providerName: string;
  providerPhone: string;
  notes: string;
};

export function toPlanForm(plan?: MaintenancePlanResponse | null): PlanForm {
  return {
    name: plan?.name ?? "",
    category: plan ? String(plan.category) : "",
    buildingId: plan?.buildingId ? String(plan.buildingId) : "",
    intervalMonths: plan ? String(plan.intervalMonths) : "12",
    nextDueDate: plan?.nextDueDate.slice(0, 10) ?? todayInputDate(),
    providerName: plan?.providerName ?? "",
    providerPhone: plan ? formatPhone(plan.providerPhone) : "",
    notes: plan?.notes ?? "",
  };
}

export function toPlanRequest(form: PlanForm): SaveMaintenancePlanRequest {
  return {
    name: form.name.trim(),
    category: Number(form.category) as MaintenanceCategory,
    buildingId: form.buildingId ? Number(form.buildingId) : null,
    intervalMonths: Number(form.intervalMonths),
    nextDueDate: form.nextDueDate,
    providerName: form.providerName.trim() || null,
    providerPhone: form.providerPhone.trim() || null,
    notes: form.notes.trim() || null,
  };
}
