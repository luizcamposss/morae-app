import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { getChargesByCondominium } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
import { getInvitationsByCondominium } from "../invitations/invitationService";
import type { InvitationResponse } from "../invitations/types";
import { getNewsByCondominium } from "../news/newsService";
import type { NewsResponse } from "../news/types";
import { getOccurrencesByCondominium } from "../occurrences/occurrenceService";
import type { OccurrenceResponse } from "../occurrences/types";
import { getPersonsByCondominium } from "../persons/personService";
import type { PersonResponse } from "../persons/types";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";

const CHARGE_STATUS_PENDING = 1;
const CHARGE_STATUS_PAID = 2;
const CHARGE_STATUS_OVERDUE = 3;
const CHARGE_STATUS_CANCELED = 4;
const INVITATION_STATUS_PENDING = 1;
const OCCURRENCE_STATUS_DONE = 3;

type DashboardState = {
  buildings: BuildingResponse[];
  units: UnitResponse[];
  people: PersonResponse[];
  invitations: InvitationResponse[];
  charges: ChargeResponse[];
  news: NewsResponse[];
  occurrences: OccurrenceResponse[];
};

type Activity = {
  id: string;
  title: string;
  description: string;
  badge: string;
  variant: "success" | "warning" | "danger" | "neutral";
  date: string;
};

type RevenueChartItem = {
  month: string;
  recebido: number;
  pendente: number;
};

type BuildingChartItem = {
  name: string;
  unidades: number;
  moradores: number;
};

const emptyState: DashboardState = {
  buildings: [],
  units: [],
  people: [],
  invitations: [],
  charges: [],
  news: [],
  occurrences: [],
};

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { activeCondominium, activeCondominiumId, isLoading: isLoadingCondominium } =
    useCondominium();
  const [dashboard, setDashboard] = useState<DashboardState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      if (!activeCondominiumId) {
        setDashboard(emptyState);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [buildings, people, invitations, charges, news, occurrences] = await Promise.all([
          getBuildingsByCondominium(activeCondominiumId),
          getPersonsByCondominium(activeCondominiumId),
          getInvitationsByCondominium(activeCondominiumId),
          getChargesByCondominium(activeCondominiumId),
          getNewsByCondominium(activeCondominiumId),
          getOccurrencesByCondominium(activeCondominiumId),
        ]);

        const unitsByBuilding = await Promise.all(
          buildings.map((building) => getUnitsByBuilding(building.id)),
        );

        setDashboard({
          buildings,
          units: unitsByBuilding.flat(),
          people,
          invitations,
          charges,
          news,
          occurrences,
        });
      } catch (error) {
        setDashboard(emptyState);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [activeCondominiumId]);

  const validCharges = dashboard.charges.filter(
    (charge) => charge.status !== CHARGE_STATUS_CANCELED,
  );
  const paidCharges = validCharges.filter((charge) => charge.status === CHARGE_STATUS_PAID);
  const pendingCharges = validCharges.filter((charge) => charge.status === CHARGE_STATUS_PENDING);
  const overdueCharges = validCharges.filter((charge) => charge.status === CHARGE_STATUS_OVERDUE);
  const occupiedUnits = dashboard.units.filter((unit) => unit.residentCount > 0).length;
  const paidRevenue = sumCharges(paidCharges);
  const pendingRevenue = sumCharges(pendingCharges) + sumCharges(overdueCharges);
  const totalRevenue = sumCharges(validCharges);
  const buildingChartData = useMemo(
    () => buildBuildingChart(dashboard.buildings),
    [dashboard.buildings],
  );
  const revenueChartData = useMemo(
    () => buildRevenueChart(dashboard.charges),
    [dashboard.charges],
  );
  const activities = useMemo(() => buildActivities(dashboard), [dashboard]);
  const showLoading = isLoading || isLoadingCondominium;
  const displayName = user?.personName || user?.userName || "Admin";

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-[#6B7280]">Bom dia</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-[#111827]">
            {displayName}
          </h1>
        </div>

        <p className="pt-3 text-sm font-bold text-[#6B7280]">{formatToday()}</p>
      </div>

      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#16A34A]">
              Dashboard Admin
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-[#111827]">
              {activeCondominium?.condominiumName ?? "Condomínio não selecionado"}
            </h2>
          </div>

          <StatusBadge
            label={activeCondominium?.status ?? "Sem condomínio"}
            variant={activeCondominium ? "success" : "neutral"}
          />
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
            {errorMessage}
          </div>
        )}

        {showLoading ? (
          <EmptyPanel title="Carregando dashboard..." description="Buscando dados do backend." />
        ) : !activeCondominiumId ? (
          <EmptyPanel
            title="Nenhum condomínio ativo"
            description="Selecione ou solicite acesso a um condomínio para visualizar o painel."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Prédios"
                value={dashboard.buildings.length.toString()}
                helper={`${dashboard.units.length} unidades cadastradas`}
              />
              <MetricCard
                label="Moradores"
                value={dashboard.people.length.toString()}
                helper={`${occupiedUnits} unidades ocupadas`}
              />
              <MetricCard
                label="Receita total"
                value={formatCurrency(totalRevenue)}
                helper="Cobranças não canceladas"
              />
              <MetricCard
                label="Receita pendente"
                value={formatCurrency(pendingRevenue)}
                helper="Valores aguardando pagamento"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <ChartCard
                title="Prédios e moradores"
                description="Unidades cadastradas e moradores vinculados por prédio."
              >
                {buildingChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={buildingChartData} margin={{ left: 0, right: 12 }}>
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 8" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={36} />
                      <Tooltip labelStyle={{ color: "#111827", fontWeight: 800 }} />
                      <Bar
                        dataKey="unidades"
                        fill="#86EFAC"
                        name="Unidades"
                        radius={[12, 12, 0, 0]}
                      />
                      <Bar
                        dataKey="moradores"
                        fill="#16A34A"
                        name="Moradores"
                        radius={[12, 12, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Cadastre prédios para visualizar a operação do condomínio." />
                )}
              </ChartCard>

              <ChartCard
                title="Receita"
                description={`${formatCurrency(paidRevenue)} recebidos · ${formatCurrency(pendingRevenue)} pendentes`}
              >
                {hasRevenueData(revenueChartData) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueChartData} margin={{ left: 0, right: 12 }}>
                      <defs>
                        <linearGradient id="adminRevenuePaid" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="adminRevenuePending" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 8" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis
                        axisLine={false}
                        tickFormatter={(value) => formatShortCurrency(Number(value))}
                        tickLine={false}
                        width={58}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        labelStyle={{ color: "#111827", fontWeight: 800 }}
                      />
                      <Area
                        dataKey="recebido"
                        fill="url(#adminRevenuePaid)"
                        name="Recebido"
                        stroke="#16A34A"
                        strokeWidth={3}
                        type="monotone"
                      />
                      <Area
                        dataKey="pendente"
                        fill="url(#adminRevenuePending)"
                        name="Pendente"
                        stroke="#F59E0B"
                        strokeWidth={3}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Nenhuma cobrança real encontrada ainda." />
                )}
              </ChartCard>
            </div>

            <section className="mt-5 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-[#111827]">
                    Atividades recentes
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Últimos movimentos reais entre prédios, moradores, cobranças e convites.
                  </p>
                </div>
                <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-black text-[#0B3D2E]">
                  {activities.length} registro(s)
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {activities.length === 0 ? (
                  <p className="rounded-2xl bg-white px-4 py-5 text-sm font-bold text-[#6B7280]">
                    Nenhuma atividade real registrada ainda.
                  </p>
                ) : (
                  activities.map((activity) => (
                    <article
                      key={activity.id}
                      className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#111827]">{activity.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                          {activity.description}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#9CA3AF]">
                          {formatDateTime(activity.date)}
                        </p>
                      </div>

                      <StatusBadge label={activity.badge} variant={activity.variant} />
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-5">
      <h3 className="text-xl font-black text-[#111827]">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-[#6B7280]">{description}</p>
      <div className="mt-5 rounded-[1.25rem] bg-white p-4">{children}</div>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-6 py-12 text-center">
      <p className="text-lg font-extrabold text-[#111827]">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[#6B7280]">{description}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-6 text-center text-sm font-bold text-[#6B7280]">
      {message}
    </div>
  );
}

function buildActivities(dashboard: DashboardState): Activity[] {
  return [
    ...dashboard.charges.map((charge) => ({
      id: `charge-${charge.id}`,
      title: charge.description,
      description: `${formatCurrency(charge.value)} · vencimento ${formatDate(charge.dueDate)}`,
      badge: getChargeStatusLabel(charge.status),
      variant: getChargeStatusVariant(charge.status),
      date: charge.createdAt,
    })),
    ...dashboard.buildings.map((building) => ({
      id: `building-${building.id}`,
      title: `${building.name} cadastrado`,
      description: `${building.unitCount} unidades · ${building.residentCount} moradores`,
      badge: building.status,
      variant: "success" as const,
      date: building.createdAt,
    })),
    ...dashboard.people.map((person) => ({
      id: `person-${person.id}`,
      title: `${person.name} cadastrado`,
      description: person.mainUnit || person.condominiumName || "Pessoa vinculada ao condomínio",
      badge: "Morador",
      variant: "neutral" as const,
      date: person.createdAt,
    })),
    ...dashboard.news.map((item) => ({
      id: `news-${item.id}`,
      title: item.title,
      description: "Comunicado publicado no condomínio",
      badge: "Comunicado",
      variant: "success" as const,
      date: item.createdAt,
    })),
    ...dashboard.occurrences.map((item) => ({
      id: `occurrence-${item.id}`,
      title: item.title,
      description: item.description,
      badge: "Ocorrência",
      variant:
        item.status === OCCURRENCE_STATUS_DONE
          ? ("success" as const)
          : ("warning" as const),
      date: item.createdAt,
    })),
    ...dashboard.invitations.map((item) => ({
      id: `invitation-${item.id}`,
      title: `Convite para ${item.personName}`,
      description: item.email,
      badge: item.statusName,
      variant:
        item.invitationStatus === INVITATION_STATUS_PENDING
          ? ("warning" as const)
          : ("neutral" as const),
      date: item.createdAt,
    })),
  ]
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 8);
}

function buildRevenueChart(charges: ChargeResponse[]): RevenueChartItem[] {
  const months = getLastSixMonths();
  const data = new Map(
    months.map((month) => [
      month.key,
      {
        month: month.label,
        recebido: 0,
        pendente: 0,
      },
    ]),
  );

  charges
    .filter((charge) => charge.status !== CHARGE_STATUS_CANCELED)
    .forEach((charge) => {
      const key = getMonthKey(charge.dueDate);
      const item = data.get(key);

      if (!item) {
        return;
      }

      if (charge.status === CHARGE_STATUS_PAID) {
        item.recebido += charge.value;
      }

      if (charge.status === CHARGE_STATUS_PENDING || charge.status === CHARGE_STATUS_OVERDUE) {
        item.pendente += charge.value;
      }
    });

  return Array.from(data.values());
}

function buildBuildingChart(buildings: BuildingResponse[]): BuildingChartItem[] {
  return buildings.map((building) => ({
    name: building.code || building.name,
    unidades: building.unitCount,
    moradores: building.residentCount,
  }));
}

function hasRevenueData(data: RevenueChartItem[]) {
  return data.some((item) => item.recebido > 0 || item.pendente > 0);
}

function getLastSixMonths() {
  const today = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);

    return {
      key: getMonthKey(date.toISOString()),
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(date)
        .replace(".", ""),
    };
  });
}

function getMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sumCharges(charges: ChargeResponse[]) {
  return charges.reduce((total, charge) => total + charge.value, 0);
}

function getChargeStatusLabel(status: ChargeResponse["status"]) {
  if (status === CHARGE_STATUS_PENDING) return "Pendente";
  if (status === CHARGE_STATUS_PAID) return "Pago";
  if (status === CHARGE_STATUS_OVERDUE) return "Atrasado";
  if (status === CHARGE_STATUS_CANCELED) return "Cancelado";
  return "Cobrança";
}

function getChargeStatusVariant(status: ChargeResponse["status"]): Activity["variant"] {
  if (status === CHARGE_STATUS_PAID) return "success";
  if (status === CHARGE_STATUS_PENDING) return "warning";
  if (status === CHARGE_STATUS_OVERDUE) return "danger";
  return "neutral";
}

function formatToday() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatShortCurrency(value: number) {
  if (value >= 1000) {
    return `R$ ${Math.round(value / 1000)}k`;
  }

  return `R$ ${Math.round(value)}`;
}
