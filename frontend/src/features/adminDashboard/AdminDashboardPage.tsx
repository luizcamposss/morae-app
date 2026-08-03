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
import { usePersistentClearedIds } from "../../shared/hooks/usePersistentClearedIds";
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
  const {
    activeCondominium,
    activeCondominiumId,
    isLoading: isLoadingCondominium,
  } = useCondominium();

  const [dashboard, setDashboard] = useState<DashboardState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [temperature, setTemperature] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!activeCondominiumId) {
        setDashboard(emptyState);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const [buildings, people, invitations, charges, news, occurrences] =
          await Promise.all([
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
            : "Não foi possível carregar o dashboard Admin.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [activeCondominiumId]);

  useEffect(() => {
    let isMounted = true;

    if (!("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m`,
          );

          if (!response.ok) {
            return;
          }

          const data = (await response.json()) as {
            current?: {
              temperature_2m?: number;
            };
          };

          if (isMounted && typeof data.current?.temperature_2m === "number") {
            setTemperature(Math.round(data.current.temperature_2m));
          }
        } catch {
          setTemperature(null);
        }
      },
      () => undefined,
      {
        maximumAge: 15 * 60 * 1000,
        timeout: 5000,
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const validCharges = dashboard.charges.filter(
    (charge) => charge.status !== CHARGE_STATUS_CANCELED,
  );
  const paidCharges = validCharges.filter(
    (charge) => charge.status === CHARGE_STATUS_PAID,
  );
  const pendingCharges = validCharges.filter(
    (charge) =>
      charge.status === CHARGE_STATUS_PENDING ||
      charge.status === CHARGE_STATUS_OVERDUE,
  );
  const occupiedUnits = dashboard.units.filter(
    (unit) => unit.residentCount > 0,
  ).length;
  const totalRevenue = sumCharges(validCharges);
  const paidRevenue = sumCharges(paidCharges);
  const pendingRevenue = sumCharges(pendingCharges);
  const displayName = user?.personName || user?.userName || "Admin";
  const showLoading = isLoading || isLoadingCondominium;

  const buildingChartData = useMemo(
    () => buildBuildingChart(dashboard.buildings),
    [dashboard.buildings],
  );
  const revenueChartData = useMemo(
    () => buildRevenueChart(dashboard.charges),
    [dashboard.charges],
  );
  const activities = useMemo(() => buildActivities(dashboard), [dashboard]);
  const [clearedActivityIds, setClearedActivityIds] = usePersistentClearedIds(
    `morae:admin-dashboard:${user?.userId ?? "anonymous"}:${activeCondominiumId ?? "none"}:cleared-activities`,
  );
  const visibleActivities = useMemo(
    () => activities.filter((activity) => !clearedActivityIds.has(activity.id)),
    [activities, clearedActivityIds],
  );

  const metrics = [
    {
      label: "Prédios",
      value: dashboard.buildings.length.toString(),
      helper: `${dashboard.units.length} unidades cadastradas`,
    },
    {
      label: "Moradores",
      value: dashboard.people.length.toString(),
      helper: `${occupiedUnits} unidades ocupadas`,
    },
    {
      label: "Receita total",
      value: formatCurrency(totalRevenue),
      helper: "Cobranças não canceladas",
    },
    {
      label: "Receita pendente",
      value: formatCurrency(pendingRevenue),
      helper: "Valores aguardando pagamento",
    },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#111827] md:text-5xl">
            {getGreeting()}, {displayName}
          </h1>
        </div>

        <div className="rounded-full bg-white px-4 py-2 text-sm font-extrabold capitalize text-[#6B7280] shadow-sm">
          <time>{formatToday()}</time>
          {temperature !== null && <span>, {temperature}°</span>}
        </div>
      </header>

      <section className="rounded-[2.25rem] border border-[#D9DEE5] bg-white p-5 shadow-sm md:p-7">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#16A34A]">
            Dashboard Admin
          </p>
          <h2 className="mt-3 text-2xl font-black text-[#111827]">
            {activeCondominium?.condominiumName ??
              "Condomínio não selecionado"}
          </h2>
        </div>

        {errorMessage && (
          <FeedbackMessage variant="danger">{errorMessage}</FeedbackMessage>
        )}

        {showLoading ? (
          <div className="mt-6">
            <EmptyState message="Carregando dados reais do condomínio..." />
          </div>
        ) : !activeCondominiumId ? (
          <div className="mt-6">
            <EmptyState message="Nenhum condomínio ativo vinculado ao seu usuário." />
          </div>
        ) : (
          <>
            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  helper={metric.helper}
                />
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <ChartPanel
                title="Prédios e moradores"
                description="Unidades cadastradas e moradores vinculados por prédio."
              >
                <BuildingBarChart data={buildingChartData} />
              </ChartPanel>

              <ChartPanel
                title="Receita do condomínio"
                description={`${formatCurrency(paidRevenue)} recebidos · ${formatCurrency(pendingRevenue)} pendentes`}
              >
                <RevenueAreaChart data={revenueChartData} />
              </ChartPanel>
            </div>

            <section className="mt-6 rounded-[1.75rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#111827]">
                    Atividades recentes
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Últimos movimentos reais entre prédios, moradores, cobranças
                    e convites.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-black text-[#0B3D2E]">
                    {visibleActivities.length} registro(s)
                  </span>

                  {visibleActivities.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setClearedActivityIds(new Set(activities.map((activity) => activity.id)))
                      }
                      className="cursor-pointer rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-black text-[#6B7280] transition hover:border-[#86EFAC] hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                    >
                      Limpar atividades
                    </button>
                  )}
                </div>
              </div>

              {activities.length === 0 ? (
                <EmptyState message="Nenhuma atividade real registrada ainda." />
              ) : visibleActivities.length === 0 ? (
                <EmptyState message="Atividades recentes limpas nesta sessão." />
              ) : (
                <div className="mt-5 max-h-[15.5rem] overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {visibleActivities.map((activity) => (
                      <article
                        key={activity.id}
                        className="rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-[#111827]">
                              {activity.title}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                              {activity.description}
                            </p>
                          </div>

                          <StatusBadge
                            label={activity.badge}
                            variant={activity.variant}
                          />
                        </div>

                        <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9CA3AF]">
                          {formatDateTime(activity.date)}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-[1.75rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
      <div>
        <h3 className="text-xl font-black text-[#111827]">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
          {description}
        </p>
      </div>

      <div className="mt-6 h-72 rounded-[1.5rem] bg-white px-3 py-5">
        {children}
      </div>
    </section>
  );
}

function BuildingBarChart({ data }: { data: BuildingChartItem[] }) {
  const hasValues = data.some(
    (item) => item.unidades > 0 || item.moradores > 0,
  );

  if (!hasValues) {
    return <EmptyState message="Cadastre prédios para visualizar a operação." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 8" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 800 }}
        />
        <YAxis
          width={46}
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 12, fontWeight: 800 }}
        />
        <Tooltip contentStyle={tooltipStyle} />
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
  );
}

function RevenueAreaChart({ data }: { data: RevenueChartItem[] }) {
  const hasValues = data.some((item) => item.recebido > 0 || item.pendente > 0);

  if (!hasValues) {
    return <EmptyState message="Nenhuma cobrança real encontrada ainda." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="adminRevenuePaid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="adminRevenuePending" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 8" vertical={false} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 800 }}
        />
        <YAxis
          width={46}
          axisLine={false}
          tickFormatter={(value) => formatCompactCurrency(Number(value))}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 12, fontWeight: 800 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Area
          dataKey="recebido"
          fill="url(#adminRevenuePaid)"
          name="Recebido"
          stroke="#16A34A"
          strokeWidth={4}
          type="linear"
        />
        <Area
          dataKey="pendente"
          fill="url(#adminRevenuePending)"
          name="Pendente"
          stroke="#F59E0B"
          strokeWidth={3}
          type="linear"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FeedbackMessage({
  children,
  variant,
}: {
  children: string;
  variant: "danger";
}) {
  const classes = {
    danger: "border border-[#FECACA] bg-[#FDECEC] text-[#B42318]",
  };

  return (
    <p className={`mt-6 rounded-2xl px-4 py-3 text-sm font-bold ${classes[variant]}`}>
      {children}
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-8 text-center">
      <p className="text-sm font-extrabold text-[#6B7280]">{message}</p>
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
      description:
        person.mainUnit || person.condominiumName || "Pessoa vinculada ao condomínio",
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
    .sort(
      (first, second) =>
        new Date(second.date).getTime() - new Date(first.date).getTime(),
    )
    .slice(0, 8);
}

function buildRevenueChart(charges: ChargeResponse[]): RevenueChartItem[] {
  const months = getLastMonths(6);
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
      const item = data.get(getMonthKey(new Date(charge.dueDate)));

      if (!item) {
        return;
      }

      if (charge.status === CHARGE_STATUS_PAID) {
        item.recebido += charge.value;
      }

      if (
        charge.status === CHARGE_STATUS_PENDING ||
        charge.status === CHARGE_STATUS_OVERDUE
      ) {
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

function getLastMonths(amount: number) {
  const today = new Date();

  return Array.from({ length: amount }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - (amount - 1 - index),
      1,
    );

    return {
      key: getMonthKey(date),
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(date)
        .replace(".", ""),
    };
  });
}

function getMonthKey(date: Date) {
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

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
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

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

const tooltipStyle = {
  border: "1px solid #E5E7EB",
  borderRadius: "16px",
  boxShadow: "0 18px 40px rgba(17, 24, 39, 0.08)",
  fontWeight: 800,
};
