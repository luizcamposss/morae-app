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
import { getMyCharges } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";
import { getNewsByCondominium } from "../news/newsService";
import type { NewsResponse } from "../news/types";
import { getMyOccurrences } from "../occurrences/occurrenceService";
import type { OccurrenceResponse } from "../occurrences/types";

const CHARGE_STATUS_PENDING = 1;
const CHARGE_STATUS_PAID = 2;
const CHARGE_STATUS_OVERDUE = 3;
const CHARGE_STATUS_CANCELED = 4;
const OCCURRENCE_STATUS_DONE = 3;

type DashboardState = {
  units: MeUnitResponse[];
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

type BillsChartItem = {
  month: string;
  pago: number;
  pendente: number;
};

type RequestsChartItem = {
  name: string;
  total: number;
};

const emptyState: DashboardState = {
  units: [],
  charges: [],
  news: [],
  occurrences: [],
};

export function ResidentDashboardPage() {
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
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [units, charges, occurrences, news] = await Promise.all([
          getMyUnits(),
          getMyCharges(),
          getMyOccurrences(),
          activeCondominiumId
            ? getNewsByCondominium(activeCondominiumId)
            : Promise.resolve([]),
        ]);

        setDashboard({ units, charges, occurrences, news });
      } catch (error) {
        setDashboard(emptyState);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o dashboard do morador.",
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

  const displayName = user?.personName || user?.userName || "Morador";
  const showLoading = isLoading || isLoadingCondominium;
  const condominiumUnits = activeCondominiumId
    ? dashboard.units.filter((unit) => unit.condominiumId === activeCondominiumId)
    : dashboard.units;
  const validCharges = dashboard.charges.filter(
    (charge) => charge.status !== CHARGE_STATUS_CANCELED,
  );
  const pendingCharges = validCharges.filter(
    (charge) =>
      charge.status === CHARGE_STATUS_PENDING ||
      charge.status === CHARGE_STATUS_OVERDUE,
  );
  const paidCharges = validCharges.filter(
    (charge) => charge.status === CHARGE_STATUS_PAID,
  );
  const openOccurrences = dashboard.occurrences.filter(
    (occurrence) => occurrence.status !== OCCURRENCE_STATUS_DONE,
  );
  const nextCharge = [...pendingCharges].sort(
    (first, second) =>
      new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime(),
  )[0];

  const billsChartData = useMemo(
    () => buildBillsChart(dashboard.charges),
    [dashboard.charges],
  );
  const requestsChartData = useMemo(
    () => buildRequestsChart(dashboard.occurrences),
    [dashboard.occurrences],
  );
  const activities = useMemo(() => buildActivities(dashboard), [dashboard]);
  const [clearedActivityIds, setClearedActivityIds] = useState<Set<string>>(
    () => new Set(),
  );
  const visibleActivities = useMemo(
    () => activities.filter((activity) => !clearedActivityIds.has(activity.id)),
    [activities, clearedActivityIds],
  );

  const metrics = [
    {
      label: "Minhas unidades",
      value: condominiumUnits.length.toString(),
      helper: "Unidades vinculadas",
    },
    {
      label: "Boletos em aberto",
      value: pendingCharges.length.toString(),
      helper: formatCurrency(sumCharges(pendingCharges)),
    },
    {
      label: "Boletos pagos",
      value: paidCharges.length.toString(),
      helper: formatCurrency(sumCharges(paidCharges)),
    },
    {
      label: "Ocorrências",
      value: openOccurrences.length.toString(),
      helper: "Abertas no momento",
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
              Dashboard Morador
            </p>
            <h2 className="mt-3 text-2xl font-black text-[#111827]">
              {activeCondominium?.condominiumName ?? "Minha área"}
            </h2>
          </div>

        </div>

        {errorMessage && (
          <FeedbackMessage variant="danger">{errorMessage}</FeedbackMessage>
        )}

        {showLoading ? (
          <div className="mt-6">
            <EmptyState message="Carregando seus dados reais..." />
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
                title="Boletos"
                description="Valores pagos e pendentes vinculados às suas unidades."
              >
                <BillsAreaChart data={billsChartData} />
              </ChartPanel>

              <ChartPanel
                title="Ocorrências"
                description="Acompanhamento das manutenções abertas e resolvidas."
              >
                <RequestsBarChart data={requestsChartData} />
              </ChartPanel>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <InfoPanel title="Próxima cobrança">
                {nextCharge ? (
                  <div className="rounded-2xl bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#111827]">
                          {nextCharge.description}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                          Vencimento em {formatDate(nextCharge.dueDate)}
                        </p>
                      </div>

                      <StatusBadge
                        label={getChargeStatusLabel(nextCharge.status)}
                        variant={getChargeStatusVariant(nextCharge.status)}
                      />
                    </div>

                    <strong className="mt-5 block text-3xl font-black text-[#111827]">
                      {formatCurrency(nextCharge.value)}
                    </strong>
                  </div>
                ) : (
                  <EmptyState message="Nenhuma cobrança pendente encontrada." />
                )}
              </InfoPanel>

              <InfoPanel title="Minhas unidades">
                {condominiumUnits.length === 0 ? (
                  <EmptyState message="Nenhuma unidade vinculada ao seu usuário ainda." />
                ) : (
                  <div className="space-y-3">
                    {condominiumUnits.map((unit) => (
                      <article key={unit.unitId} className="rounded-2xl bg-white p-4">
                        <p className="font-black text-[#111827]">
                          {unit.buildingName} · Unidade {unit.unitNumber}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                          {unit.condominiumName}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </InfoPanel>
            </div>

            <section className="mt-6 rounded-[1.75rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#111827]">
                    Atividades recentes
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Comunicados, boletos e ocorrências vinculados ao seu perfil.
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
                <EmptyState message="Nenhuma atividade real encontrada ainda." />
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

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
      <h3 className="text-xl font-black text-[#111827]">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BillsAreaChart({ data }: { data: BillsChartItem[] }) {
  const hasValues = data.some((item) => item.pago > 0 || item.pendente > 0);

  if (!hasValues) {
    return <EmptyState message="Nenhum boleto encontrado ainda." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="residentPaidBills" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="residentPendingBills" x1="0" x2="0" y1="0" y2="1">
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
          dataKey="pago"
          fill="url(#residentPaidBills)"
          name="Pago"
          stroke="#16A34A"
          strokeWidth={4}
          type="linear"
        />
        <Area
          dataKey="pendente"
          fill="url(#residentPendingBills)"
          name="Pendente"
          stroke="#F59E0B"
          strokeWidth={3}
          type="linear"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function RequestsBarChart({ data }: { data: RequestsChartItem[] }) {
  const hasValues = data.some((item) => item.total > 0);

  if (!hasValues) {
    return <EmptyState message="Nenhuma ocorrência encontrada ainda." />;
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
    ...dashboard.charges.map((charge) => ({
      id: `charge-${charge.id}`,
      title: charge.description,
      description: `${formatCurrency(charge.value)} · vencimento ${formatDate(charge.dueDate)}`,
      badge: getChargeStatusLabel(charge.status),
      variant: getChargeStatusVariant(charge.status),
      date: charge.createdAt,
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
  ]
    .sort(
      (first, second) =>
        new Date(second.date).getTime() - new Date(first.date).getTime(),
    )
    .slice(0, 8);
}

function buildBillsChart(charges: ChargeResponse[]): BillsChartItem[] {
  const months = getLastMonths(6);
  const data = new Map(
    months.map((month) => [
      month.key,
      {
        month: month.label,
        pago: 0,
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
        item.pago += charge.value;
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

function buildRequestsChart(occurrences: OccurrenceResponse[]): RequestsChartItem[] {
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
  return "Boleto";
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
