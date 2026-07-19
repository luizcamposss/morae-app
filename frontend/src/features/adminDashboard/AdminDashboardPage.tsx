import { useEffect, useState } from "react";
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
  title: string;
  time: string;
  badge: string;
  variant: "success" | "warning" | "danger" | "neutral";
  createdAt: string;
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

  const occupiedUnits = dashboard.units.filter((unit) => unit.residentCount > 0).length;
  const pendingInvitations = dashboard.invitations.filter(
    (invitation) => invitation.invitationStatus === 1,
  ).length;
  const openCharges = dashboard.charges.filter((charge) => charge.status === 1).length;
  const overdueCharges = dashboard.charges.filter((charge) => charge.status === 3).length;
  const openOccurrences = dashboard.occurrences.filter(
    (occurrence) => occurrence.status !== 3,
  ).length;

  const activities = buildActivities(dashboard);
  const showLoading = isLoading || isLoadingCondominium;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-[#6B7280]">Bom dia</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-[#111827]">
            {user?.personName ?? "Admin"}
          </h1>
        </div>

        <p className="pt-3 text-sm font-bold text-[#6B7280]">{formatToday()}</p>
      </div>

      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#16A34A]">
              Dashboard Admin
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-[#111827]">
              {activeCondominium?.condominiumName ?? "Condomínio não selecionado"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Visão operacional com dados reais do condomínio ativo.
            </p>
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
                helper="Cadastrados no condomínio"
              />
              <MetricCard
                label="Unidades"
                value={dashboard.units.length.toString()}
                helper={`${occupiedUnits} ocupadas`}
              />
              <MetricCard
                label="Moradores"
                value={dashboard.people.length.toString()}
                helper="Pessoas cadastradas"
              />
              <MetricCard
                label="Convites pendentes"
                value={pendingInvitations.toString()}
                helper="Aguardando aceite"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="min-h-48 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
                <p className="text-sm font-extrabold text-[#111827]">
                  Ocupação por prédio
                </p>
                <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                  Relação real de unidades ocupadas por prédio.
                </p>

                <div className="mt-6 space-y-4">
                  {dashboard.buildings.length === 0 ? (
                    <p className="text-sm font-bold text-[#6B7280]">
                      Nenhum prédio cadastrado ainda.
                    </p>
                  ) : (
                    dashboard.buildings.map((building) => {
                      const percentage =
                        building.unitCount > 0
                          ? Math.round((building.occupiedUnitCount / building.unitCount) * 100)
                          : 0;

                      return (
                        <div key={building.id}>
                          <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#111827]">
                            <span>{building.name}</span>
                            <span>
                              {building.occupiedUnitCount}/{building.unitCount}
                            </span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-[#16A34A]"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="min-h-48 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
                <p className="text-sm font-extrabold text-[#111827]">
                  Operação do condomínio
                </p>
                <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                  Indicadores operacionais vindos dos módulos conectados.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SmallStat label="Cobranças abertas" value={openCharges} />
                  <SmallStat label="Atrasadas" value={overdueCharges} />
                  <SmallStat label="Ocorrências abertas" value={openOccurrences} />
                </div>
              </div>
            </div>

            <section className="mt-5 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-[#111827]">
                Atividades recentes
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                Últimas movimentações reais encontradas nos módulos conectados.
              </p>

              <div className="mt-6 space-y-3">
                {activities.length === 0 ? (
                  <p className="rounded-2xl bg-[#F3F4F6] px-4 py-5 text-sm font-bold text-[#6B7280]">
                    Nenhuma atividade registrada ainda.
                  </p>
                ) : (
                  activities.map((activity) => (
                    <div
                      key={`${activity.badge}-${activity.createdAt}-${activity.title}`}
                      className="flex flex-col gap-3 rounded-2xl bg-[#F3F4F6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#111827]">{activity.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>

                      <StatusBadge label={activity.badge} variant={activity.variant} />
                    </div>
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

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <strong className="block text-2xl font-extrabold text-[#111827]">{value}</strong>
      <span className="mt-1 block text-xs font-bold text-[#6B7280]">{label}</span>
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

function buildActivities(dashboard: DashboardState): Activity[] {
  const activities: Activity[] = [
    ...dashboard.news.map((item) => ({
      title: item.title,
      time: item.createdAt,
      badge: "Comunicado",
      variant: "success" as const,
      createdAt: item.createdAt,
    })),
    ...dashboard.occurrences.map((item) => ({
      title: item.title,
      time: item.createdAt,
      badge: "Ocorrência",
      variant: item.status === 3 ? ("success" as const) : ("warning" as const),
      createdAt: item.createdAt,
    })),
    ...dashboard.charges.map((item) => ({
      title: item.description,
      time: item.createdAt,
      badge: getChargeStatusLabel(item.status),
      variant: getChargeStatusVariant(item.status),
      createdAt: item.createdAt,
    })),
    ...dashboard.invitations.map((item) => ({
      title: `Convite para ${item.personName}`,
      time: item.createdAt,
      badge: item.statusName,
      variant: item.invitationStatus === 1 ? ("warning" as const) : ("neutral" as const),
      createdAt: item.createdAt,
    })),
  ];

  return activities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
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

function formatToday() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
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
