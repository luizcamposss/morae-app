import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { apiDownload } from "../../shared/lib/api/apiClient";
import { todayInputDate } from "../../shared/lib/date";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { FinanceTabs } from "../finance/FinanceTabs";
import { useModuleEnabled } from "../modules/modules";
import { useSyndicCan } from "../syndicAccess/useSyndicAccess";

type ReportType = "delinquency" | "receipts" | "expenses" | "balance";

const reports: Array<{ value: ReportType; label: string; hint: string }> = [
  { value: "receipts", label: "Recebimentos", hint: "O que entrou no período, por categoria e forma de pagamento." },
  { value: "delinquency", label: "Inadimplência", hint: "Cobranças vencidas no período e ainda em aberto, com multa e juros de hoje." },
  { value: "expenses", label: "Despesas", hint: "Contas pagas no período, com categoria e fornecedor." },
  { value: "balance", label: "Balanço", hint: "Entradas, saídas e saldo de cada mês do período." },
];

// First and last day of the current month in São Paulo.
function currentMonthPeriod() {
  const today = todayInputDate();
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${today.slice(0, 7)}-01`, to: `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}` };
}

// "Relatórios" tab of the Financeiro: Excel or PDF of the period, with only what the user may see.
export function ReportsPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const [period] = useState(currentMonthPeriod);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [buildingId, setBuildingId] = useState("");
  const [buildings, setBuildings] = useState<BuildingResponse[]>([]);
  const [downloading, setDownloading] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const canFinance = useSyndicCan("finance");
  const canDelinquency = useSyndicCan("delinquency.view");
  const canExpenses = useSyndicCan("expenses.manage");
  const hasExpenses = useModuleEnabled("expenses");

  const options = reports.filter((report) => {
    if (report.value === "receipts") return canFinance;
    if (report.value === "delinquency") return canDelinquency;
    if (report.value === "expenses") return hasExpenses && canExpenses;
    return hasExpenses && canExpenses && canFinance;
  });
  const [picked, setPicked] = useState<ReportType | null>(null);
  const reportType = options.some((option) => option.value === picked) ? picked! : options[0]?.value;

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;
    // The API lists only the buildings a syndic manages.
    getBuildingsByCondominium(activeCondominiumId)
      .then((result) => isMounted && setBuildings(result))
      .catch(() => isMounted && setBuildings([]));
    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  async function download(format: "xlsx" | "pdf") {
    if (!activeCondominiumId || !reportType) return;
    if (!from || !to) return setError("Informe o início e o fim do período.");
    if (from > to) return setError("A data final precisa ser igual ou posterior à inicial.");

    const query = new URLSearchParams({ from, to, format });
    if (buildingId) query.set("buildingId", buildingId);
    setDownloading(format);
    setError("");
    try {
      await apiDownload(`/api/condominiums/${activeCondominiumId}/reports/${reportType}?${query.toString()}`, `morae-${reportType}.${format}`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Não foi possível baixar o relatório.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Financeiro" />
      <FinanceTabs />

      {options.length === 0 ? (
        <p className="rounded-field bg-campo px-4 py-5 text-sm text-tinta-suave">Você ainda não tem acesso a nenhum relatório.</p>
      ) : (
        <section className="max-w-3xl rounded-card bg-superficie p-5 shadow-whisper sm:p-6">
          <div role="radiogroup" aria-label="Relatório" className="grid gap-2 sm:grid-cols-2">
            {options.map((option) => {
              const isActive = option.value === reportType;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setPicked(option.value)}
                  className={`rounded-field px-4 py-3 text-left transition-colors ${isActive ? "bg-verde-suave ring-2 ring-verde" : "bg-campo hover:bg-menu"}`}
                >
                  <span className="block text-[15px] font-semibold text-tinta">{option.label}</span>
                  <span className="block text-[13px] text-tinta-suave">{option.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <TextField label="De" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <TextField label="Até" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
            <SelectField
              label="Prédio"
              value={buildingId}
              options={[{ value: "", label: "Todos os prédios" }, ...buildings.map((building) => ({ value: String(building.id), label: building.name }))]}
              onChange={(event) => setBuildingId(event.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => void download("xlsx")} isLoading={downloading === "xlsx"} loadingText="Gerando Excel…" disabled={downloading !== null}>
              <Download size={16} strokeWidth={1.8} aria-hidden />
              Baixar Excel
            </Button>
            <Button variant="quiet" onClick={() => void download("pdf")} isLoading={downloading === "pdf"} loadingText="Gerando PDF…" disabled={downloading !== null}>
              <Download size={16} strokeWidth={1.8} aria-hidden />
              Baixar PDF
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
