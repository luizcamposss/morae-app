import { apiRequest } from "../../shared/lib/api/apiClient";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, formatDateTime, todayInputDate } from "../../shared/lib/date";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { getChargesByCondominium } from "../charges/chargeService";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import { countRemindersToday, describeReminders } from "../charges/reminders";
import type { ChargeResponse } from "../charges/types";
import { getInvitationsByCondominium } from "../invitations/invitationService";
import type { InvitationResponse } from "../invitations/types";
import { MAINTENANCE_STATUS } from "../maintenance/maintenanceMeta";
import { getMaintenancePlans } from "../maintenance/maintenanceService";
import type { MaintenancePlanResponse } from "../maintenance/types";
import { getNewsByCondominium } from "../news/newsService";
import type { NewsResponse } from "../news/types";
import { getOccurrencesByCondominium } from "../occurrences/occurrenceService";
import type { OccurrenceResponse } from "../occurrences/types";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";
import { VISIT_STATUS } from "../visits/visitMeta";
import { getVisitAgenda } from "../visits/visitService";
import type { VisitResponse } from "../visits/types";

// Only the fields the dashboard needs from the assemblies list (no assemblies screen on this branch yet).
type AssemblyListItem = { id: number; title: string; phase: number; votingEndsAt: string };
const ASSEMBLY_PHASE_OPEN = 3;
const OCCURRENCE_OPEN = 1;
const OCCURRENCE_IN_PROGRESS = 2;
const INVITATION_STATUS_PENDING = 1;

export type DashboardData = {
  condominiumId: number;
  buildings: BuildingResponse[];
  units: UnitResponse[];
  people: PersonResponse[];
  invitations: InvitationResponse[];
  charges: ChargeResponse[];
  news: NewsResponse[];
  occurrences: OccurrenceResponse[];
  maintenance: MaintenancePlanResponse[];
  visitsToday: VisitResponse[];
  openAssemblies: AssemblyListItem[];
  errorMessage: string;
};

// Secondary sources never break the dashboard: they just show up empty.
const orEmpty = <T,>(promise: Promise<T[]>) => promise.catch(() => [] as T[]);

export async function fetchDashboard(condominiumId: number): Promise<DashboardData> {
  const today = todayInputDate();
  const [buildings, charges, people, invitations, news, occurrences, maintenance, visitsToday, assemblies] = await Promise.all([
    getBuildingsByCondominium(condominiumId),
    getChargesByCondominium(condominiumId),
    orEmpty(getPersonsByCondominium(condominiumId)),
    orEmpty(getInvitationsByCondominium(condominiumId)),
    orEmpty(getNewsByCondominium(condominiumId)),
    orEmpty(getOccurrencesByCondominium(condominiumId)),
    orEmpty(getMaintenancePlans(condominiumId)),
    orEmpty(getVisitAgenda(condominiumId, { from: today, to: today })),
    orEmpty(apiRequest<AssemblyListItem[]>(`/api/condominiums/${condominiumId}/assemblies`, { auth: true })),
  ]);
  const unitsByBuilding = await Promise.all(buildings.map((building) => getUnitsByBuilding(building.id)));

  return {
    condominiumId,
    buildings,
    units: unitsByBuilding.flat(),
    people,
    invitations,
    charges,
    news,
    occurrences,
    maintenance,
    visitsToday: visitsToday.filter((visit) => visit.status === VISIT_STATUS.active),
    openAssemblies: assemblies.filter((assembly) => assembly.phase === ASSEMBLY_PHASE_OPEN),
    errorMessage: "",
  };
}

export function emptyDashboard(condominiumId: number, errorMessage = ""): DashboardData {
  return {
    condominiumId,
    buildings: [],
    units: [],
    people: [],
    invitations: [],
    charges: [],
    news: [],
    occurrences: [],
    maintenance: [],
    visitsToday: [],
    openAssemblies: [],
    errorMessage,
  };
}

export type TodayItem = {
  key: string;
  tone: "red" | "amber" | "green" | "neutral";
  title: string;
  subtitle: string;
  to?: string;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const names = (list: string[]) => (list.length > 2 ? `${list.slice(0, 2).join(", ")} e mais ${list.length - 2}` : list.join(" e "));

// What needs attention today, most urgent first. Only rows with something to do.
export function buildTodayItems(data: DashboardData): TodayItem[] {
  const items: TodayItem[] = [];
  // Late charges are not repeated here: the summary and "Unidades em atraso" already show them.
  const lateMaintenance = data.maintenance.filter((plan) => plan.status === MAINTENANCE_STATUS.overdue);
  const dueMaintenance = data.maintenance.filter((plan) => plan.status === MAINTENANCE_STATUS.dueSoon);
  if (lateMaintenance.length || dueMaintenance.length) {
    const soonest = [...lateMaintenance, ...dueMaintenance].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    items.push({
      key: "maintenance",
      tone: lateMaintenance.length ? "red" : "amber",
      title: lateMaintenance.length
        ? `${plural(lateMaintenance.length, "manutenção vencida", "manutenções vencidas")}${dueMaintenance.length ? ` e ${dueMaintenance.length} vencendo` : ""}`
        : plural(dueMaintenance.length, "manutenção vencendo", "manutenções vencendo"),
      subtitle: `${names(soonest.map((plan) => plan.name))} · próxima ${formatCalendarDate(soonest[0].nextDueDate)}`,
      to: "/admin/preventive-maintenance",
    });
  }

  const openOccurrences = data.occurrences.filter((item) => item.status === OCCURRENCE_OPEN || item.status === OCCURRENCE_IN_PROGRESS);
  if (openOccurrences.length) {
    items.push({
      key: "occurrences",
      tone: "amber",
      title: plural(openOccurrences.length, "ocorrência aberta", "ocorrências abertas"),
      subtitle: names(openOccurrences.map((item) => item.title)),
    });
  }

  for (const assembly of data.openAssemblies) {
    items.push({ key: `assembly-${assembly.id}`, tone: "green", title: `Votação aberta: ${assembly.title}`, subtitle: `Fecha em ${formatDateTime(assembly.votingEndsAt)}` });
  }

  if (data.visitsToday.length) {
    items.push({
      key: "visits",
      tone: "neutral",
      title: plural(data.visitsToday.length, "visita prevista hoje", "visitas previstas hoje"),
      subtitle: names(data.visitsToday.map((visit) => visit.visitorName)),
      to: "/admin/visitors",
    });
  }

  // What Moraê did on its own today: the charge reminders e-mailed by the scheduled job.
  const reminders = countRemindersToday(data.charges);
  if (reminders.total) {
    items.push({
      key: "reminders",
      tone: "neutral",
      title: `${plural(reminders.total, "lembrete enviado", "lembretes enviados")} hoje`,
      subtitle: describeReminders(reminders),
      to: "/admin/payments",
    });
  }

  return items;
}

export type Activity = { id: string; title: string; description: string; badge: string; tone: "success" | "warning" | "danger" | "neutral"; date: string };

const chargeBadges: Record<number, { badge: string; tone: Activity["tone"] }> = {
  1: { badge: "Em aberto", tone: "warning" },
  2: { badge: "Paga", tone: "success" },
  3: { badge: "Atrasada", tone: "danger" },
  4: { badge: "Cancelada", tone: "neutral" },
};

// Latest movements among charges, buildings, people, notices, occurrences and invitations.
export function buildActivities(data: DashboardData): Activity[] {
  return [
    ...data.charges.map((charge) => ({
      id: `charge-${charge.id}`,
      title: charge.description,
      description: `${formatCurrency(charge.value)} · vence ${formatCalendarDate(charge.dueDate)}`,
      ...(chargeBadges[charge.status] ?? { badge: "Cobrança", tone: "neutral" as const }),
      date: charge.createdAt,
    })),
    ...data.buildings.map((building) => ({
      id: `building-${building.id}`,
      title: `${building.name} cadastrado`,
      description: `${building.unitCount} unidades · ${building.residentCount} moradores`,
      badge: "Prédio",
      tone: "neutral" as const,
      date: building.createdAt,
    })),
    ...data.people.map((person) => ({
      id: `person-${person.id}`,
      title: `${person.name} cadastrado`,
      description: person.mainUnit || "Pessoa vinculada ao condomínio",
      badge: "Morador",
      tone: "neutral" as const,
      date: person.createdAt,
    })),
    ...data.news.map((item) => ({ id: `news-${item.id}`, title: item.title, description: "Aviso publicado", badge: "Aviso", tone: "success" as const, date: item.createdAt })),
    ...data.occurrences.map((item) => ({
      id: `occurrence-${item.id}`,
      title: item.title,
      description: item.description,
      badge: "Ocorrência",
      tone: item.status === 3 ? ("success" as const) : ("warning" as const),
      date: item.createdAt,
    })),
    ...data.invitations.map((item) => ({
      id: `invitation-${item.id}`,
      title: `Convite para ${item.personName}`,
      description: item.email,
      badge: item.statusName,
      tone: item.invitationStatus === INVITATION_STATUS_PENDING ? ("warning" as const) : ("neutral" as const),
      date: item.createdAt,
    })),
  ]
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 8);
}

export type LateUnit = { unitId: number; label: string; person: string; total: number; count: number };

// Units with overdue charges, largest debt first.
export function buildLateUnits(data: DashboardData): LateUnit[] {
  const byUnit = new Map<number, LateUnit>();
  const unitById = new Map(data.units.map((unit) => [unit.id, unit]));

  for (const charge of data.charges) {
    if (charge.status !== CHARGE_STATUS.overdue || !charge.unitId) continue;
    const unit = unitById.get(charge.unitId);
    const current = byUnit.get(charge.unitId) ?? {
      unitId: charge.unitId,
      label: `${charge.buildingName ?? unit?.buildingName ?? ""} · ${charge.unitNumber ?? unit?.number ?? ""}`,
      person: unit?.responsiblePersonName ?? "",
      total: 0,
      count: 0,
    };
    current.total += charge.updatedAmount || charge.value;
    current.count += 1;
    byUnit.set(charge.unitId, current);
  }

  return [...byUnit.values()].sort((a, b) => b.total - a.total);
}
