import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
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
import { getNewsByCondominium } from "../news/newsService";
import type { NewsResponse } from "../news/types";
import { getOccurrencesByCondominium } from "../occurrences/occurrenceService";
import type { OccurrenceResponse } from "../occurrences/types";
import { getMyUnits } from "../me/meService";
import { getPeopleByUnit } from "../personUnits/personUnitService";
import type { PersonUnitResponse } from "../personUnits/types";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";

const CHARGE_STATUS_PENDING = 1;
const CHARGE_STATUS_OVERDUE = 3;
const OCCURRENCE_STATUS_DONE = 3;

type DashboardState = {
  buildings: BuildingResponse[];
  units: UnitResponse[];
  people: PersonUnitResponse[];
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

type OccupancyChartItem = {
  name: string;
  unidades: number;
  ocupadas: number;
};

type OccurrenceChartItem = {
  name: string;
  total: number;
};

const emptyState: DashboardState = {
  buildings: [],
  units: [],
  people: [],
  charges: [],
  news: [],
  occurrences: [],
};

export function SyndicDashboardPage() {
  const { user } = useAuth();
  const {
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

        const [buildings, myUnits, charges, news, occurrences] = await Promise.all([
          getBuildingsByCondominium(activeCondominiumId),
          getMyUnits(),
          getChargesByCondominium(activeCondominiumId),
          getNewsByCondominium(activeCondominiumId),
          getOccurrencesByCondominium(activeCondominiumId),
        ]);

        const linkedBuildingIds = new Set(
          myUnits
            .filter((unit) => unit.condominiumId === activeCondominiumId)
            .map((unit) => unit.buildingId),
        );
        const visibleBuildings = buildings.filter((building) =>
          linkedBuildingIds.has(building.id),
        );

        const unitsByBuilding = await Promise.all(
          visibleBuildings.map((building) => getUnitsByBuilding(building.id)),
        );
        const visibleUnits = unitsByBuilding.flat();
        const visibleUnitIds = new Set(visibleUnits.map((unit) => unit.id));

        const peopleByUnit = await Promise.all(
          visibleUnits.map((unit) => getPeopleByUnit(unit.id)),
        );

        const visibleCharges = charges.filter(
          (charge) => charge.unitId != null && visibleUnitIds.has(charge.unitId),
        );
        const visibleNews = news.filter(
          (item) => item.buildingId != null && linkedBuildingIds.has(item.buildingId),
        );
        const visibleOccurrences = occurrences.filter((occurrence) =>
          visibleUnitIds.has(occurrence.unitId),
        );

        setDashboard({
          buildings: visibleBuildings,
          units: visibleUnits,
          people: deduplicatePeople(peopleByUnit.flat()),
          charges: visibleCharges,
          news: visibleNews,
          occurrences: visibleOccurrences,
        });
      } catch (error) {
        setDashboard(emptyState);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o dashboard do síndico.",
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

  const displayName = user?.personName || user?.userName || "Síndico";
  const showLoading = isLoading || isLoadingCondominium;
  const managedBuildingLabel =
    showLoading
      ? "Carregando prédios vinculados"
      : dashboard.buildings.length === 0
        ? "Nenhum prédio vinculado"
        : dashboard.buildings.length === 1
          ? dashboard.buildings[0].name
          : `${dashboard.buildings.length} prédios vinculados`;
  const occupiedUnits = dashboard.units.filter((unit) => unit.residentCount > 0).length;
  const openOccurrences = dashboard.occurrences.filter(
    (occurrence) => occurrence.status !== OCCURRENCE_STATUS_DONE,
  ).length;
  const pendingCharges = dashboard.charges.filter(
    (charge) =>
      charge.status === CHARGE_STATUS_PENDING ||
      charge.status === CHARGE_STATUS_OVERDUE,
  ).length;

  const occupancyChartData = useMemo(
    () => buildOccupancyChart(dashboard.buildings),
    [dashboard.buildings],
  );
  const occurrenceChartData = useMemo(
    () => buildOccurrenceChart(dashboard.occurrences),
    [dashboard.occurrences],
  );
  const activities = useMemo(() => buildActivities(dashboard), [dashboard]);
  const [clearedActivityIds, setClearedActivityIds] = usePersistentClearedIds(
    `morae:syndic-dashboard:${user?.userId ?? "anonymous"}:${activeCondominiumId ?? "none"}:cleared-activities`,
  );
  const visibleActivities = useMemo(
    () => activities.filter((activity) => !clearedActivityIds.has(activity.id)),
    [activities, clearedActivityIds],
  );

  const metrics = [
    {
      label: "Prédios",
      value: dashboard.buildings.length.toString(),
      helper: "Sob sua gestão",
    },
    {
      label: "Unidades",
      value: dashboard.units.length.toString(),
      helper: `${occupiedUnits} em uso`,
    },
    {
      label: "Moradores",
      value: dashboard.people.length.toString(),
      helper: "Nos prédios vinculados",
    },
    {
      label: "Ocorrências",
      value: openOccurrences.toString(),
      helper: "Em acompanhamento",
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
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#16A34A]">
              Dashboard Síndico
            </p>
            <h2 className="mt-3 text-2xl font-black text-[#111827]">
              {managedBuildingLabel}
            </h2>
          </div>

        </div>

        {errorMessage && (
          <FeedbackMessage variant="danger">{errorMessage}</FeedbackMessage>
        )}

        {showLoading ? (
          <div className="mt-6">
            <EmptyState message="Carregando dados permitidos ao seu perfil..." />
          </div>
        ) : !activeCondominiumId ? (
          <div className="mt-6">
            <EmptyState message="Seu usuário ainda não possui acesso ativo." />
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
                title="Ocupação dos seus prédios"
                description="Unidades cadastradas e ocupadas nos prédios vinculados ao seu perfil."
              >
                <OccupancyBarChart data={occupancyChartData} />
              </ChartPanel>

              <ChartPanel
                title="Rotina dos seus prédios"
                description={`${pendingCharges} cobrança(s) pendente(s) · ${openOccurrences} ocorrência(s) aberta(s)`}
              >
                <OccurrenceBarChart data={occurrenceChartData} />
              </ChartPanel>
            </div>

            <section className="mt-6 rounded-[1.75rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#111827]">
                    Atividades recentes
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Comunicados, ocorrências e movimentações dos prédios vinculados.
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
                <EmptyState message="Nenhuma atividade registrada nos prédios vinculados." />
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

function OccupancyBarChart({ data }: { data: OccupancyChartItem[] }) {
  const hasValues = data.some((item) => item.unidades > 0 || item.ocupadas > 0);

  if (!hasValues) {
    return <EmptyState message="Nenhum prédio vinculado ao seu perfil." />;
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
          dataKey="ocupadas"
          fill="#16A34A"
          name="Ocupadas"
          radius={[12, 12, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function OccurrenceBarChart({ data }: { data: OccurrenceChartItem[] }) {
  const hasValues = data.some((item) => item.total > 0);

  if (!hasValues) {
    return <EmptyState message="Nenhuma ocorrência registrada nos prédios vinculados." />;
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
          dataKey="total"
          fill="#16A34A"
          name="Ocorrências"
          radius={[12, 12, 0, 0]}
        />
      </BarChart>
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

function deduplicatePeople(people: PersonUnitResponse[]) {
  const peopleById = new Map<number, PersonUnitResponse>();

  for (const person of people) {
    peopleById.set(person.personId, person);
  }

  return Array.from(peopleById.values());
}
function buildActivities(dashboard: DashboardState): Activity[] {
  return [
    ...dashboard.news.map((item) => ({
      id: `news-${item.id}`,
      title: item.title,
      description: item.description,
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
    ...dashboard.charges.map((charge) => ({
      id: `charge-${charge.id}`,
      title: charge.description,
      description: `${formatCurrency(charge.value)} · vencimento ${formatDate(charge.dueDate)}`,
      badge: getChargeStatusLabel(charge.status),
      variant: getChargeStatusVariant(charge.status),
      date: charge.createdAt,
    })),
  ]
    .sort(
      (first, second) =>
        new Date(second.date).getTime() - new Date(first.date).getTime(),
    )
    .slice(0, 8);
}

function buildOccupancyChart(buildings: BuildingResponse[]): OccupancyChartItem[] {
  return buildings.map((building) => ({
    name: building.code || building.name,
    unidades: building.unitCount,
    ocupadas: building.occupiedUnitCount,
  }));
}

function buildOccurrenceChart(
  occurrences: OccurrenceResponse[],
): OccurrenceChartItem[] {
  return [
    {
      name: "Abertas",
      total: occurrences.filter((item) => item.status !== OCCURRENCE_STATUS_DONE)
        .length,
    },
    {
      name: "Resolvidas",
      total: occurrences.filter((item) => item.status === OCCURRENCE_STATUS_DONE)
        .length,
    },
  ];
}

function getChargeStatusLabel(status: ChargeResponse["status"]) {
  if (status === 1) return "Pendente";
  if (status === 2) return "Pago";
  if (status === 3) return "Atrasado";
  if (status === 4) return "Cancelado";
  return "Cobrança";
}

function getChargeStatusVariant(status: ChargeResponse["status"]): Activity["variant"] {
  if (status === 2) return "success";
  if (status === 1) return "warning";
  if (status === 3) return "danger";
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

const tooltipStyle = {
  border: "1px solid #E5E7EB",
  borderRadius: "16px",
  boxShadow: "0 18px 40px rgba(17, 24, 39, 0.08)",
  fontWeight: 800,
};
