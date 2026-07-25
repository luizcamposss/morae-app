import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../app/providers/useAuth";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getPlatformCharges } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { getInvitationsByCondominium } from "../invitations/invitationService";
import type { InvitationResponse } from "../invitations/types";

const ACTIVE_STATUS = 1;
const PENDING_INVITATION_STATUS = 1;
const ACCEPTED_INVITATION_STATUS = 2;
const ADMIN_ROLE = 2;
const CHARGE_STATUS_PENDING = 1;
const CHARGE_STATUS_PAID = 2;
const CHARGE_STATUS_OVERDUE = 3;
const CHARGE_STATUS_CANCELED = 4;

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  badge: string;
  variant: "success" | "warning" | "danger" | "neutral";
};

type CondominiumChartItem = {
  month: string;
  novos: number;
  acumulado: number;
};

type RevenueChartItem = {
  month: string;
  recebida: number;
  pendente: number;
};

export function MasterDashboardPage() {
  const { user } = useAuth();

  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
  const [platformCharges, setPlatformCharges] = useState<ChargeResponse[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [temperature, setTemperature] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setErrorMessage("");
        setWarningMessage("");
        setIsLoading(true);

        const [condominiumResult, chargeResult] = await Promise.all([
          getCondominiums(),
          getPlatformCharges(),
        ]);

        setCondominiums(condominiumResult);
        setPlatformCharges(chargeResult);

        const invitationResults = await Promise.allSettled(
          condominiumResult.map((condominium) =>
            getInvitationsByCondominium(condominium.id),
          ),
        );

        const loadedInvitations = invitationResults
          .filter((result): result is PromiseFulfilledResult<InvitationResponse[]> =>
            result.status === "fulfilled",
          )
          .flatMap((result) => result.value);

        setInvitations(loadedInvitations);

        const hasInvitationFailure = invitationResults.some(
          (result) => result.status === "rejected",
        );

        if (hasInvitationFailure) {
          setWarningMessage("Alguns convites não puderam ser carregados agora.");
        }
      } catch (error) {
        setCondominiums([]);
        setPlatformCharges([]);
        setInvitations([]);

        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Não foi possível carregar o dashboard Master.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

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

  const adminInvitations = invitations.filter(
    (invitation) => invitation.role === ADMIN_ROLE,
  );

  const pendingAdminInvitations = adminInvitations.filter(
    (invitation) => invitation.invitationStatus === PENDING_INVITATION_STATUS,
  );

  const validPlatformCharges = platformCharges.filter(
    (charge) => charge.status !== CHARGE_STATUS_CANCELED,
  );

  const pendingRevenue = platformCharges
    .filter(
      (charge) =>
        charge.status === CHARGE_STATUS_PENDING ||
        charge.status === CHARGE_STATUS_OVERDUE,
    )
    .reduce((total, charge) => total + charge.value, 0);

  const totalRevenue = validPlatformCharges.reduce(
    (total, charge) => total + charge.value,
    0,
  );

  const displayName = user?.personName || user?.userName || "Master";
  const chartPaidRevenue = platformCharges
    .filter((charge) => charge.status === CHARGE_STATUS_PAID)
    .reduce((total, charge) => total + charge.value, 0);
  const chartPendingRevenue = platformCharges
    .filter(
      (charge) =>
        charge.status === CHARGE_STATUS_PENDING ||
        charge.status === CHARGE_STATUS_OVERDUE,
    )
    .reduce((total, charge) => total + charge.value, 0);
  const condominiumChartData = buildCondominiumChart(condominiums);
  const revenueChartData = buildRevenueChart(platformCharges);

  const activities = useMemo<ActivityItem[]>(
    () =>
      [
        ...condominiums.map((condominium) => ({
          id: `condominium-${condominium.id}`,
          title: `${condominium.name} cadastrado`,
          description: formatLocation(condominium),
          date: condominium.createdAt,
          badge: getCondominiumStatusLabel(condominium.status),
          variant: getCondominiumStatusVariant(condominium.status),
        })),
        ...platformCharges.map((charge) => ({
          id: `charge-${charge.id}`,
          title: `Cobrança MORAÊ para ${charge.condominiumName}`,
          description: `${formatCurrency(charge.value)} · vencimento ${formatDate(charge.dueDate)}`,
          date: charge.dueDate,
          badge: getChargeStatusLabel(charge.status),
          variant: getChargeStatusVariant(charge.status),
        })),
        ...pendingAdminInvitations.map((invitation) => ({
          id: `invitation-${invitation.id}`,
          title: `Convite pendente para ${invitation.personName}`,
          description: `${invitation.condominiumName} · ${invitation.email}`,
          date: invitation.createdAt,
          badge: invitation.statusName,
          variant: getInvitationStatusVariant(invitation.invitationStatus),
        })),
      ]
        .sort(
          (first, second) =>
            new Date(second.date).getTime() - new Date(first.date).getTime(),
        )
        .slice(0, 6),
    [condominiums, pendingAdminInvitations, platformCharges],
  );

  const metrics = [
    {
      label: "Total de condomínios",
      value: condominiums.length.toString(),
      helper: "Base cadastrada na plataforma",
    },
    {
      label: "Convites pendentes",
      value: pendingAdminInvitations.length.toString(),
      helper: "Administradores aguardando aceite",
    },
    {
      label: "Receita total",
      value: formatCurrency(totalRevenue),
      helper: "Cobranças MORAÊ não canceladas",
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
            Dashboard Master
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#111827]">
            Plataforma MORAÊ
          </h2>
        </div>

        {isLoading && (
          <FeedbackMessage variant="neutral">
            Carregando dados reais da plataforma...
          </FeedbackMessage>
        )}

        {errorMessage && (
          <FeedbackMessage variant="danger">{errorMessage}</FeedbackMessage>
        )}

        {warningMessage && (
          <FeedbackMessage variant="warning">{warningMessage}</FeedbackMessage>
        )}

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
            title="Crescimento de condomínios"
            description="Novos cadastros e base acumulada nos últimos meses."
          >
            <CondominiumLineChart data={condominiumChartData} />
          </ChartPanel>

          <ChartPanel
            title="Receita MORAÊ"
            description={`${formatCurrency(chartPaidRevenue)} recebidos · ${formatCurrency(chartPendingRevenue)} pendentes`}
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
                Últimos movimentos reais entre condomínios, cobranças e convites.
              </p>
            </div>
          </div>

          {activities.length === 0 && !isLoading ? (
            <EmptyState message="Nenhuma atividade encontrada ainda." />
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {activities.map((activity) => (
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

                    <StatusBadge label={activity.badge} variant={activity.variant} />
                  </div>

                  <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9CA3AF]">
                    {formatDate(activity.date)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
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

function CondominiumLineChart({ data }: { data: CondominiumChartItem[] }) {
  const hasValues = data.some((item) => item.novos > 0 || item.acumulado > 0);

  if (!hasValues) {
    return <EmptyState message="Nenhum condomínio cadastrado ainda." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 8" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 800 }} />
        <YAxis width={46} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12, fontWeight: 800 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="linear" dataKey="acumulado" name="Base acumulada" stroke="#0B3D2E" strokeWidth={4} dot={{ r: 5, fill: "#0B3D2E" }} activeDot={{ r: 7 }} />
        <Line type="linear" dataKey="novos" name="Novos" stroke="#22C55E" strokeWidth={3} dot={{ r: 4, fill: "#22C55E" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RevenueAreaChart({ data }: { data: RevenueChartItem[] }) {
  const hasValues = data.some((item) => item.recebida > 0 || item.pendente > 0);

  if (!hasValues) {
    return <EmptyState message="Nenhuma cobrança MORAÊ encontrada ainda." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="paidRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="pendingRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 8" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 800 }} />
        <YAxis width={46} axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fill: "#9CA3AF", fontSize: 12, fontWeight: 800 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
        <Area type="linear" dataKey="recebida" name="Recebida" stroke="#16A34A" strokeWidth={4} fill="url(#paidRevenue)" />
        <Area type="linear" dataKey="pendente" name="Pendente" stroke="#F59E0B" strokeWidth={3} fill="url(#pendingRevenue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FeedbackMessage({
  children,
  variant,
}: {
  children: string;
  variant: "neutral" | "warning" | "danger";
}) {
  const classes = {
    neutral: "bg-[#F3F4F6] text-[#6B7280]",
    warning: "border border-[#FDE68A] bg-[#FFF6DF] text-[#9A6A00]",
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

function buildCondominiumChart(condominiums: CondominiumResponse[]) {
  const months = getLastMonths(6);
  const sortedCondominiums = [...condominiums].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );

  return months.map((month) => {
    const monthEnd = new Date(month.year, month.month + 1, 0, 23, 59, 59);
    const novos = sortedCondominiums.filter(
      (condominium) => getMonthKey(new Date(condominium.createdAt)) === month.key,
    ).length;
    const acumulado = sortedCondominiums.filter(
      (condominium) => new Date(condominium.createdAt) <= monthEnd,
    ).length;

    return {
      month: month.label,
      novos,
      acumulado,
    };
  });
}

function buildRevenueChart(charges: ChargeResponse[]) {
  const months = getLastMonths(6);

  return months.map((month) => {
    const monthCharges = charges.filter(
      (charge) => getMonthKey(new Date(charge.dueDate)) === month.key,
    );

    return {
      month: month.label,
      recebida: sumChargesByStatus(monthCharges, [CHARGE_STATUS_PAID]),
      pendente: sumChargesByStatus(monthCharges, [
        CHARGE_STATUS_PENDING,
        CHARGE_STATUS_OVERDUE,
      ]),
    };
  });
}

function sumChargesByStatus(charges: ChargeResponse[], statuses: number[]) {
  return charges
    .filter((charge) => statuses.includes(charge.status))
    .reduce((total, charge) => total + charge.value, 0);
}

function getLastMonths(amount: number) {
  const today = new Date();

  return Array.from({ length: amount }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (amount - 1 - index), 1);

    return {
      key: getMonthKey(date),
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(date)
        .replace(".", ""),
      year: date.getFullYear(),
      month: date.getMonth(),
    };
  });
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function formatLocation(condominium: CondominiumResponse) {
  const cityState = [condominium.city, condominium.state]
    .filter(Boolean)
    .join(" - ");

  return cityState || condominium.address || "Sem localização";
}

function getCondominiumStatusLabel(status: number) {
  return status === ACTIVE_STATUS ? "Ativo" : "Inativo";
}

function getCondominiumStatusVariant(status: number) {
  return status === ACTIVE_STATUS ? ("success" as const) : ("neutral" as const);
}

function getInvitationStatusVariant(status: number) {
  if (status === PENDING_INVITATION_STATUS) return "warning" as const;
  if (status === ACCEPTED_INVITATION_STATUS) return "success" as const;
  if (status === 3 || status === 4 || status === 5) return "danger" as const;
  return "neutral" as const;
}

function getChargeStatusLabel(status: ChargeResponse["status"]) {
  if (status === CHARGE_STATUS_PENDING) return "Pendente";
  if (status === CHARGE_STATUS_PAID) return "Pago";
  if (status === CHARGE_STATUS_OVERDUE) return "Atrasado";
  if (status === CHARGE_STATUS_CANCELED) return "Cancelado";
  return "Indefinido";
}

function getChargeStatusVariant(status: ChargeResponse["status"]) {
  if (status === CHARGE_STATUS_PAID) return "success" as const;
  if (status === CHARGE_STATUS_PENDING) return "warning" as const;
  if (status === CHARGE_STATUS_OVERDUE || status === CHARGE_STATUS_CANCELED) {
    return "danger" as const;
  }
  return "neutral" as const;
}

const tooltipStyle = {
  border: "1px solid #E5E7EB",
  borderRadius: "16px",
  boxShadow: "0 18px 40px rgba(17, 24, 39, 0.08)",
  fontWeight: 800,
};
