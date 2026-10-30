import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { OccupancyBar } from "../buildings/BuildingModals";
import { getCondominiumNumbers, percentOf, sumNumbers, type CondominiumNumbers } from "./portfolio";

type NumbersState = Record<number, CondominiumNumbers | "error">;

export function AdminPortfolioPage() {
  const navigate = useNavigate();
  const { condominiums, activeCondominiumId, isLoading: isLoadingCondominiums, errorMessage, setActiveCondominiumId } = useCondominium();
  const [numbersById, setNumbersById] = useState<NumbersState>({});

  // Only the condominiums where the user is the Admin make up the portfolio.
  const portfolio = useMemo(() => condominiums.filter((condominium) => condominium.role === "Admin"), [condominiums]);
  const portfolioKey = portfolio.map((condominium) => condominium.condominiumId).join(",");

  useEffect(() => {
    if (!portfolioKey) return;
    let isMounted = true;

    // Each condominium loads on its own, so one failure doesn't hide the others.
    for (const id of portfolioKey.split(",").map(Number)) {
      getCondominiumNumbers(id)
        .then((numbers) => isMounted && setNumbersById((current) => ({ ...current, [id]: numbers })))
        .catch(() => isMounted && setNumbersById((current) => ({ ...current, [id]: "error" })));
    }

    return () => {
      isMounted = false;
    };
  }, [portfolioKey]);

  const loaded = portfolio.map((condominium) => numbersById[condominium.condominiumId]).filter((item): item is CondominiumNumbers => typeof item === "object");
  const isLoading = isLoadingCondominiums || portfolio.some((condominium) => !(condominium.condominiumId in numbersById));
  const failedCount = portfolio.filter((condominium) => numbersById[condominium.condominiumId] === "error").length;
  const totals = sumNumbers(loaded);
  const dash = (value: string) => (isLoading ? "–" : value);

  function openCondominium(condominiumId: number) {
    setActiveCondominiumId(condominiumId);
    navigate("/admin/dashboard");
  }

  return (
    <>
      <PageHeader
        overline={isLoadingCondominiums ? undefined : `${portfolio.length} condomínio${portfolio.length === 1 ? "" : "s"} sob sua gestão`}
        title="Carteira"
      />

      {errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}
      {failedCount > 0 && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          Não foi possível carregar os números de {failedCount === 1 ? "um condomínio" : `${failedCount} condomínios`}. Os totais mostram só os que carregaram.
        </p>
      )}

      <SummaryCard
        items={[
          { label: "Condomínios", value: dash(String(portfolio.length)), detail: `${totals.residentCount} morador${totals.residentCount === 1 ? "" : "es"} no total` },
          {
            label: "Ocupação",
            value: dash(`${percentOf(totals.occupiedUnitCount, totals.unitCount)}%`),
            detail: `${totals.occupiedUnitCount} de ${totals.unitCount} unidade${totals.unitCount === 1 ? "" : "s"}`,
          },
          {
            label: "Recebido no mês",
            value: dash(formatCurrency(totals.monthReceived)),
            detail: `de ${formatCurrency(totals.monthExpected)} previstos`,
            tone: totals.monthExpected > 0 && totals.monthReceived >= totals.monthExpected ? "good" : "neutral",
          },
          {
            label: "Em atraso",
            value: dash(formatCurrency(totals.overdueValue)),
            detail: `${totals.overdueCount} cobrança${totals.overdueCount === 1 ? "" : "s"}`,
            tone: totals.overdueCount > 0 ? "danger" : "neutral",
          },
        ]}
      />

      <h2 className="mb-4 mt-10 font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">Seus condomínios</h2>

      {portfolio.length === 0 ? (
        <div className="flex flex-col items-center rounded-card bg-superficie px-5 py-12 text-center shadow-whisper">
          {isLoadingCondominiums ? (
            <span className="text-sm text-tinta-suave">Carregando…</span>
          ) : (
            <>
              <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                <Building2 size={22} strokeWidth={1.8} aria-hidden />
              </span>
              <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhum condomínio na sua carteira</span>
              <span className="mt-1 max-w-sm text-sm text-tinta-suave">Quando a plataforma vincular você como Admin de um condomínio, ele aparece aqui.</span>
            </>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {portfolio.map((condominium) => {
            const numbers = numbersById[condominium.condominiumId];
            const isActive = condominium.condominiumId === activeCondominiumId;
            return (
              <li key={condominium.condominiumId}>
                <button
                  type="button"
                  onClick={() => openCondominium(condominium.condominiumId)}
                  className="flex h-full w-full flex-col rounded-card bg-superficie p-5 text-left shadow-whisper transition-colors hover:bg-campo/60 sm:p-6"
                >
                  <span className="flex w-full items-center gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                      <Building2 size={18} strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[16px] font-semibold text-tinta">{condominium.condominiumName}</span>
                        {isActive && <span className="shrink-0 rounded-chip bg-verde-suave px-2 py-0.5 text-xs font-semibold text-verde-tinta">Aberto agora</span>}
                      </span>
                      <span className="block truncate text-[13px] text-tinta-suave">
                        {typeof numbers === "object"
                          ? `${numbers.buildingCount} prédio${numbers.buildingCount === 1 ? "" : "s"} · ${numbers.unitCount} unidade${numbers.unitCount === 1 ? "" : "s"}`
                          : numbers === "error"
                            ? "Números indisponíveis"
                            : "Carregando…"}
                      </span>
                    </span>
                    <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                  </span>

                  {typeof numbers === "object" && <CondominiumFigures numbers={numbers} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function CondominiumFigures({ numbers }: { numbers: CondominiumNumbers }) {
  const occupancy = percentOf(numbers.occupiedUnitCount, numbers.unitCount);
  const hasOverdue = numbers.overdueCount > 0;

  return (
    <span className="mt-5 block w-full border-t border-linha pt-5">
      <span className="flex items-baseline justify-between text-xs text-tinta-suave">
        <span>
          Ocupação · {numbers.occupiedUnitCount}/{numbers.unitCount} unidades
        </span>
        <span className="font-semibold tabular-nums text-tinta">{occupancy}%</span>
      </span>
      <OccupancyBar value={occupancy} className="mt-1.5" />

      <span className="mt-5 grid grid-cols-3 gap-3">
        <Figure label="Moradores" value={String(numbers.residentCount)} />
        <Figure label="Recebido no mês" value={formatCurrency(numbers.monthReceived)} detail={`de ${formatCurrency(numbers.monthExpected)}`} />
        <Figure
          label="Em atraso"
          value={formatCurrency(numbers.overdueValue)}
          detail={hasOverdue ? `${numbers.overdueCount} cobrança${numbers.overdueCount === 1 ? "" : "s"}` : "nada atrasado"}
          danger={hasOverdue}
        />
      </span>
    </span>
  );
}

function Figure({ label, value, detail, danger = false }: { label: string; value: string; detail?: string; danger?: boolean }) {
  return (
    <span className="min-w-0">
      <span className="block text-xs text-tinta-suave">{label}</span>
      <span className={`mt-1 block truncate text-[15px] font-semibold tabular-nums ${danger ? "text-vermelho" : "text-tinta"}`}>{value}</span>
      {detail && <span className="block truncate text-xs text-tinta-suave">{detail}</span>}
    </span>
  );
}
