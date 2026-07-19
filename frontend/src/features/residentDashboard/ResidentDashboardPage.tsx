import { useEffect, useState } from "react";
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

type DashboardState = {
  units: MeUnitResponse[];
  charges: ChargeResponse[];
  news: NewsResponse[];
  occurrences: OccurrenceResponse[];
};

const emptyState: DashboardState = {
  units: [],
  charges: [],
  news: [],
  occurrences: [],
};

export function ResidentDashboardPage() {
  const { user } = useAuth();
  const { activeCondominium, activeCondominiumId, isLoading: isLoadingCondominium } =
    useCondominium();
  const [dashboard, setDashboard] = useState<DashboardState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [units, charges, occurrences, news] = await Promise.all([
          getMyUnits(),
          getMyCharges(),
          getMyOccurrences(),
          activeCondominiumId ? getNewsByCondominium(activeCondominiumId) : Promise.resolve([]),
        ]);

        setDashboard({ units, charges, occurrences, news });
      } catch (error) {
        setDashboard(emptyState);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o painel do morador.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [activeCondominiumId]);

  const condominiumUnits = activeCondominiumId
    ? dashboard.units.filter((unit) => unit.condominiumId === activeCondominiumId)
    : dashboard.units;
  const pendingCharges = dashboard.charges.filter((charge) => charge.status === 1);
  const overdueCharges = dashboard.charges.filter((charge) => charge.status === 3);
  const openOccurrences = dashboard.occurrences.filter((occurrence) => occurrence.status !== 3);
  const nextCharge = [...pendingCharges, ...overdueCharges].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )[0];
  const showLoading = isLoading || isLoadingCondominium;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-[#6B7280]">Bom dia</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-[#111827]">
            {user?.personName ?? "Morador"}
          </h1>
        </div>

        <p className="pt-3 text-sm font-bold text-[#6B7280]">{formatToday()}</p>
      </div>

      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#16A34A]">
            Dashboard Morador
          </p>
          <h2 className="mt-3 text-2xl font-extrabold text-[#111827]">
            {activeCondominium?.condominiumName ?? "Minha área"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#6B7280]">
            Dados reais da sua unidade, cobranças, comunicados e solicitações.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
            {errorMessage}
          </div>
        )}

        {showLoading ? (
          <EmptyPanel title="Carregando dashboard..." description="Buscando suas informações." />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Minhas unidades"
                value={condominiumUnits.length.toString()}
                helper="Vinculadas ao seu cadastro"
              />
              <MetricCard
                label="Cobranças pendentes"
                value={pendingCharges.length.toString()}
                helper="Aguardando pagamento"
              />
              <MetricCard
                label="Comunicados"
                value={dashboard.news.length.toString()}
                helper="Publicados no condomínio"
              />
              <MetricCard
                label="Solicitações"
                value={openOccurrences.length.toString()}
                helper="Abertas ou em andamento"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="min-h-48 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
                <p className="text-sm font-extrabold text-[#111827]">Próxima cobrança</p>
                <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                  Cobrança real mais próxima encontrada para suas unidades.
                </p>

                {nextCharge ? (
                  <div className="mt-6 rounded-2xl bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-[#6B7280]">
                        {nextCharge.description}
                      </span>
                      <StatusBadge
                        label={getChargeStatusLabel(nextCharge.status)}
                        variant={getChargeStatusVariant(nextCharge.status)}
                      />
                    </div>
                    <strong className="mt-4 block text-3xl font-extrabold text-[#111827]">
                      {formatCurrency(nextCharge.value)}
                    </strong>
                    <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                      Vencimento em {formatDate(nextCharge.dueDate)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-6 rounded-2xl bg-white p-5 text-sm font-bold text-[#6B7280]">
                    Nenhuma cobrança pendente encontrada.
                  </p>
                )}
              </div>

              <div className="min-h-48 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
                <p className="text-sm font-extrabold text-[#111827]">Minhas unidades</p>
                <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                  Unidades vinculadas ao seu cadastro.
                </p>

                <div className="mt-6 space-y-3">
                  {condominiumUnits.length === 0 ? (
                    <p className="rounded-2xl bg-white p-4 text-sm font-bold text-[#6B7280]">
                      Nenhuma unidade vinculada ao seu usuário ainda.
                    </p>
                  ) : (
                    condominiumUnits.map((unit) => (
                      <div key={unit.unitId} className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-[#111827]">
                          {unit.buildingName} - Unidade {unit.unitNumber}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                          {unit.condominiumName}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <section className="mt-5 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-[#111827]">
                Comunicados recentes
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                Últimas publicações reais do condomínio.
              </p>

              <div className="mt-6 space-y-3">
                {dashboard.news.length === 0 ? (
                  <p className="rounded-2xl bg-[#F3F4F6] px-4 py-5 text-sm font-bold text-[#6B7280]">
                    Nenhum comunicado publicado ainda.
                  </p>
                ) : (
                  dashboard.news.slice(0, 4).map((news) => (
                    <div
                      key={news.id}
                      className="flex flex-col gap-3 rounded-2xl bg-[#F3F4F6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#111827]">{news.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                          {formatDate(news.createdAt)}
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

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-6 py-12 text-center">
      <p className="text-lg font-extrabold text-[#111827]">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[#6B7280]">{description}</p>
    </div>
  );
}

function getChargeStatusLabel(status: ChargeResponse["status"]) {
  if (status === 1) return "Pendente";
  if (status === 2) return "Pago";
  if (status === 3) return "Atrasado";
  if (status === 4) return "Cancelado";
  return "Cobrança";
}

function getChargeStatusVariant(status: ChargeResponse["status"]) {
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
