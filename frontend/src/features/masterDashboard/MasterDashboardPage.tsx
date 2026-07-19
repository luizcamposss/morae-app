import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/providers/useAuth";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getCondominiums } from "../condominiums/condominiumService";
import type { CondominiumResponse } from "../condominiums/types";
import { getInvitationsByCondominium } from "../invitations/invitationService";
import type { InvitationResponse } from "../invitations/types";

const ACTIVE_STATUS = 1;
const PENDING_INVITATION_STATUS = 1;
const ACCEPTED_INVITATION_STATUS = 2;
const ADMIN_ROLE = 2;

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  badge: string;
  variant: "success" | "warning" | "danger" | "neutral";
};

type BarItem = {
  label: string;
  value: number;
  color: string;
};

export function MasterDashboardPage() {
  const { user } = useAuth();

  const [condominiums, setCondominiums] = useState<CondominiumResponse[]>([]);
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

        const condominiumResult = await getCondominiums();
        setCondominiums(condominiumResult);

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

  const activeCondominiums = condominiums.filter(
    (condominium) => condominium.status === ACTIVE_STATUS,
  );

  const inactiveCondominiums = condominiums.filter(
    (condominium) => condominium.status !== ACTIVE_STATUS,
  );

  const adminInvitations = invitations.filter(
    (invitation) => invitation.role === ADMIN_ROLE,
  );

  const pendingAdminInvitations = adminInvitations.filter(
    (invitation) => invitation.invitationStatus === PENDING_INVITATION_STATUS,
  );

  const acceptedAdminInvitations = adminInvitations.filter(
    (invitation) => invitation.invitationStatus === ACCEPTED_INVITATION_STATUS,
  );

  const closedAdminInvitations = adminInvitations.filter(
    (invitation) =>
      invitation.invitationStatus !== PENDING_INVITATION_STATUS &&
      invitation.invitationStatus !== ACCEPTED_INVITATION_STATUS,
  );

  const displayName = user?.personName || user?.userName || "Master";

  const condominiumBars: BarItem[] = [
    {
      label: "Ativos",
      value: activeCondominiums.length,
      color: "#16A34A",
    },
    {
      label: "Inativos",
      value: inactiveCondominiums.length,
      color: "#6B7280",
    },
    {
      label: "Total",
      value: condominiums.length,
      color: "#0B3D2E",
    },
  ];

  const invitationBars: BarItem[] = [
    {
      label: "Pendentes",
      value: pendingAdminInvitations.length,
      color: "#F59E0B",
    },
    {
      label: "Aceitos",
      value: acceptedAdminInvitations.length,
      color: "#16A34A",
    },
    {
      label: "Encerrados",
      value: closedAdminInvitations.length,
      color: "#EF4444",
    },
  ];

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
        ...adminInvitations.map((invitation) => ({
          id: `invitation-${invitation.id}`,
          title: `Convite para ${invitation.personName}`,
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
    [adminInvitations, condominiums],
  );

  const metrics = [
    {
      label: "Total de condomínios",
      value: condominiums.length.toString(),
      helper: "Base cadastrada na plataforma",
    },
    {
      label: "Condomínios ativos",
      value: activeCondominiums.length.toString(),
      helper: "Liberados para relacionamento",
    },
    {
      label: "Convites pendentes",
      value: pendingAdminInvitations.length.toString(),
      helper: "Administradores aguardando aceite",
    },
    {
      label: "Convites aceitos",
      value: acceptedAdminInvitations.length.toString(),
      helper: "Administradores já integrados",
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
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#16A34A]">
              Dashboard Master
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#111827]">
              Visão Geral do Sistema
            </h2>
          </div>
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
          <SummaryPanel
            title="Panorama de condomínios"
            description="Distribuição da base cadastrada no sistema."
            bars={condominiumBars}
            emptyMessage="Nenhum condomínio cadastrado ainda."
          />

          <SummaryPanel
            title="Convites administrativos"
            description="Situação dos acessos enviados pelo Master."
            bars={invitationBars}
            emptyMessage="Nenhum convite de administrador encontrado."
          />
        </div>

        <section className="mt-6 rounded-[1.75rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-black text-[#111827]">
                Atividades recentes
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                Últimos movimentos reais entre condomínios e convites.
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

function SummaryPanel({
  title,
  description,
  bars,
  emptyMessage,
}: {
  title: string;
  description: string;
  bars: BarItem[];
  emptyMessage: string;
}) {
  const maxValue = Math.max(...bars.map((bar) => bar.value), 0);
  const hasValues = bars.some((bar) => bar.value > 0);

  return (
    <section className="rounded-[1.75rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
      <div>
        <h3 className="text-xl font-black text-[#111827]">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
          {description}
        </p>
      </div>

      {!hasValues ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="mt-6 flex h-56 items-end gap-4 rounded-[1.5rem] bg-white p-5">
          {bars.map((bar) => (
            <div key={bar.label} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex h-32 w-full items-end rounded-full bg-[#F3F4F6] p-1.5">
                <div
                  className="w-full rounded-full transition-all"
                  style={{
                    height: getBarHeight(bar.value, maxValue),
                    backgroundColor: bar.color,
                  }}
                />
              </div>

              <strong className="mt-3 text-lg font-black text-[#111827]">
                {bar.value}
              </strong>
              <span className="mt-1 truncate text-xs font-extrabold text-[#6B7280]">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
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
    <div className="mt-4 rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-8 text-center">
      <p className="text-sm font-extrabold text-[#6B7280]">{message}</p>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getBarHeight(value: number, maxValue: number) {
  if (maxValue === 0 || value === 0) return "10%";

  return `${Math.max(18, Math.round((value / maxValue) * 100))}%`;
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
