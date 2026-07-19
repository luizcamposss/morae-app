import { useEffect, useState } from "react";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { getChargesByCondominium } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";
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
  charges: ChargeResponse[];
  news: NewsResponse[];
  occurrences: OccurrenceResponse[];
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
        const [buildings, people, charges, news, occurrences] = await Promise.all([
          getBuildingsByCondominium(activeCondominiumId),
          getPersonsByCondominium(activeCondominiumId),
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
          charges,
          news,
          occurrences,
        });
      } catch (error) {
        setDashboard(emptyState);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o painel do síndico.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [activeCondominiumId]);

  const occupiedUnits = dashboard.units.filter((unit) => unit.residentCount > 0).length;
  const openOccurrences = dashboard.occurrences.filter(
    (occurrence) => occurrence.status !== 3,
  ).length;
  const pendingCharges = dashboard.charges.filter((charge) => charge.status === 1).length;
  const latestNews = dashboard.news.slice(0, 3);
  const showLoading = isLoading || isLoadingCondominium;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-[#6B7280]">Bom dia</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-[#111827]">
            {user?.personName ?? "Síndico"}
          </h1>
        </div>

        <p className="pt-3 text-sm font-bold text-[#6B7280]">{formatToday()}</p>
      </div>

      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#16A34A]">
            Dashboard Síndico
          </p>
          <h2 className="mt-3 text-2xl font-extrabold text-[#111827]">
            {activeCondominium?.condominiumName ?? "Condomínio não selecionado"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#6B7280]">
            Consulta operacional com dados permitidos ao seu perfil.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
            {errorMessage}
          </div>
        )}

        {showLoading ? (
          <EmptyPanel title="Carregando dashboard..." description="Buscando dados reais." />
        ) : !activeCondominiumId ? (
          <EmptyPanel
            title="Nenhum condomínio ativo"
            description="Seu usuário ainda não possui condomínio ativo vinculado."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Prédios"
                value={dashboard.buildings.length.toString()}
                helper="Estrutura cadastrada"
              />
              <MetricCard
                label="Unidades"
                value={dashboard.units.length.toString()}
                helper={`${occupiedUnits} ocupadas`}
              />
              <MetricCard
                label="Moradores"
                value={dashboard.people.length.toString()}
                helper="Pessoas do condomínio"
              />
              <MetricCard
                label="Ocorrências"
                value={openOccurrences.toString()}
                helper="Abertas ou em andamento"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="min-h-48 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
                <p className="text-sm font-extrabold text-[#111827]">Ocupação</p>
                <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                  Unidades ocupadas em relação ao total cadastrado.
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
                <p className="text-sm font-extrabold text-[#111827]">Resumo operacional</p>
                <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                  Informações consolidadas dos módulos conectados.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SmallStat label="Cobranças pendentes" value={pendingCharges} />
                  <SmallStat label="Comunicados" value={dashboard.news.length} />
                  <SmallStat label="Ocorrências abertas" value={openOccurrences} />
                </div>
              </div>
            </div>

            <section className="mt-5 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-[#111827]">
                Comunicados recentes
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                Últimos comunicados reais publicados no condomínio.
              </p>

              <div className="mt-6 space-y-3">
                {latestNews.length === 0 ? (
                  <p className="rounded-2xl bg-[#F3F4F6] px-4 py-5 text-sm font-bold text-[#6B7280]">
                    Nenhum comunicado registrado ainda.
                  </p>
                ) : (
                  latestNews.map((news) => (
                    <div
                      key={news.id}
                      className="flex flex-col gap-3 rounded-2xl bg-[#F3F4F6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#111827]">{news.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                          {formatDateTime(news.createdAt)}
                        </p>
                      </div>

                      <StatusBadge label="Comunicado" variant="success" />
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
