import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { todayInputDate } from "../../shared/lib/date";
import { MonthNavigator } from "../expenses/MonthNavigator";
import { monthOf, shiftMonth } from "../expenses/expenseMeta";
import { useIsSyndicArea, useSyndicCan } from "../syndicAccess/useSyndicAccess";
import {
  UTILITIES,
  formatReading,
  getReadingMonth,
  getUtilityRates,
  parseReading,
  saveReadings,
  utilityInfo,
  type ReadingMonth,
  type ReadingRow,
  type Utility,
  type UtilityRate,
} from "./consumptionService";
import { UtilityRatesModal } from "./UtilityRatesModal";

type Draft = Record<number, { current: string; previous: string }>;

// A consumption this many times the unit's recent average gets a warning.
const UNUSUAL_FACTOR = 2;

// "Leituras do mês": one row per unit, the previous reading already filled in. Saving puts each
// amount in the monthly bill (the tenant's when the rental contract includes it).
export function ReadingsPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const isSyndic = useIsSyndicArea();
  const canEdit = useSyndicCan("charges.create");
  const currentMonth = monthOf(todayInputDate());
  const [month, setMonth] = useState(currentMonth);
  const [rates, setRates] = useState<UtilityRate[] | null>(null);
  const [utility, setUtility] = useState<Utility>(3);
  const [data, setData] = useState<{ key: string; month: ReadingMonth | null; error: string } | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${activeCondominiumId}-${month}-${utility}-${reloadKey}`;
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  const enabledUtilities = UTILITIES.filter((item) => rates?.find((rate) => rate.category === item.value)?.enabled);
  const hasEnabledUtility = enabledUtilities.length > 0;
  const shownUtility = enabledUtilities.some((item) => item.value === utility) ? utility : (enabledUtilities[0]?.value ?? 3);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;
    getUtilityRates(activeCondominiumId)
      .then((result) => isMounted && setRates(result))
      .catch(() => isMounted && setRates([]));
    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, reloadKey]);

  useEffect(() => {
    if (!activeCondominiumId || !hasEnabledUtility) return;
    let isMounted = true;
    getReadingMonth(activeCondominiumId, month, shownUtility)
      .then((result) => {
        if (!isMounted) return;
        setData({ key, month: result, error: "" });
        setDraft({});
      })
      .catch((error) => isMounted && setData({ key, month: null, error: error instanceof Error ? error.message : "Não foi possível carregar as leituras." }));
    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, month, shownUtility, key, hasEnabledUtility]);

  const isLoading = data?.key !== key;
  const rows = useMemo(() => (isLoading ? [] : (data?.month?.rows ?? [])), [data, isLoading]);
  const rate = data?.month?.rate;
  const info = utilityInfo(shownUtility);

  // What each row shows right now: the typed values, or what is stored.
  function preview(row: ReadingRow) {
    const typed = draft[row.unitId];
    const current = typed ? parseReading(typed.current) : row.currentReading;
    const previous = row.previousReading ?? (typed ? parseReading(typed.previous) : null);
    if (current == null || previous == null || Number.isNaN(current) || Number.isNaN(previous)) return { current, previous, consumption: null, amount: null, error: "" };
    if (current < previous) return { current, previous, consumption: null, amount: null, error: "Menor que a anterior" };
    const consumption = Math.round((current - previous) * 1000) / 1000;
    const amount = rate ? Math.round(Math.max(consumption * rate.pricePerUnit, rate.minimumCharge) * 100) / 100 : null;
    return { current, previous, consumption, amount, error: "" };
  }

  const changedRows = rows.filter((row) => draft[row.unitId]?.current.trim());
  const hasErrors = changedRows.some((row) => {
    const result = preview(row);
    return result.error || result.previous == null || Number.isNaN(result.current) || Number.isNaN(result.previous);
  });
  const monthTotal = rows.reduce((sum, row) => sum + (preview(row).amount ?? 0), 0);

  function type(unitId: number, field: "current" | "previous", value: string) {
    setFeedback(null);
    setDraft((drafts) => ({ ...drafts, [unitId]: { ...(drafts[unitId] ?? { current: "", previous: "" }), [field]: value.replace(/[^\d.,]/g, "") } }));
  }

  async function handleSave() {
    if (!activeCondominiumId || changedRows.length === 0) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await saveReadings(
        activeCondominiumId,
        month,
        shownUtility,
        changedRows.map((row) => {
          const values = preview(row);
          return { unitId: row.unitId, currentReading: values.current as number, previousReading: row.previousReading == null ? (values.previous as number) : null };
        }),
      );
      setFeedback({ tone: "ok", text: `${result.saved === 1 ? "1 leitura salva" : `${result.saved} leituras salvas`} · ${formatCurrency(result.total)} nas contas do mês (em rascunho).` });
      reload();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível salvar as leituras." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Leituras">
        {!isSyndic && (
          <Button variant="quiet" size="sm" onClick={() => setIsRatesOpen(true)}>
            <SlidersHorizontal size={16} strokeWidth={1.8} aria-hidden />
            Preços
          </Button>
        )}
      </PageHeader>

      {rates && enabledUtilities.length === 0 ? (
        <div className="rounded-card bg-campo px-6 py-10 text-center">
          <p className="font-semibold text-tinta">Nenhum preço configurado</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-tinta-suave">
            {isSyndic ? "A administração precisa configurar o preço da água, da luz ou do gás." : "Configure o preço por m³ ou kWh de cada conta que o condomínio mede por unidade."}
          </p>
          {!isSyndic && (
            <Button size="sm" className="mt-4" onClick={() => setIsRatesOpen(true)}>
              Configurar preços
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <MonthNavigator month={month} maxMonth={shiftMonth(currentMonth, 1)} onChange={setMonth} />
            <div role="tablist" aria-label="Conta" className="inline-flex gap-1 rounded-block bg-menu p-1">
              {enabledUtilities.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={shownUtility === item.value}
                  onClick={() => setUtility(item.value)}
                  className={`rounded-field px-4 py-2 text-sm font-semibold transition-colors ${shownUtility === item.value ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {rate && (
              <p className="text-[13px] text-tinta-suave sm:ml-auto">
                {formatCurrency(rate.pricePerUnit)} por {info.unit}
                {rate.minimumCharge > 0 ? ` · mínimo ${formatCurrency(rate.minimumCharge)}` : ""}
              </p>
            )}
          </div>

          {feedback && (
            <p role={feedback.tone === "error" ? "alert" : "status"} className={`mb-6 rounded-field px-4 py-3 text-sm font-medium ${feedback.tone === "error" ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}>
              {feedback.text}
            </p>
          )}
          {data?.error && !isLoading && (
            <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
              {data.error}
            </p>
          )}

          <div className="overflow-x-auto rounded-card bg-superficie shadow-whisper">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-linha text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-tinta-suave">
                  <th className="px-4 py-3">Unidade</th>
                  <th className="px-4 py-3 text-right">Anterior</th>
                  <th className="px-4 py-3 text-right">Atual</th>
                  <th className="px-4 py-3 text-right">Consumo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-tinta-suave">
                      Carregando…
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const values = preview(row);
                    const typed = draft[row.unitId];
                    const isUnusual = values.consumption != null && row.averageConsumption != null && row.averageConsumption > 0 && values.consumption > row.averageConsumption * UNUSUAL_FACTOR;
                    const readOnly = row.isLocked || !canEdit;
                    return (
                      <tr key={row.unitId}>
                        <td className="px-4 py-2.5">
                          <span className="block font-semibold text-tinta">
                            {row.buildingName} · {row.unitNumber}
                          </span>
                          <span className="block text-[12px] text-tinta-suave">{row.payerName ? `Conta de ${row.payerName}` : "Conta da unidade"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-tinta-suave">
                          {row.previousReading != null ? (
                            formatReading(row.previousReading)
                          ) : readOnly ? (
                            "–"
                          ) : (
                            <input
                              aria-label={`Leitura anterior de ${row.buildingName} ${row.unitNumber}`}
                              value={typed?.previous ?? ""}
                              onChange={(event) => type(row.unitId, "previous", event.target.value)}
                              inputMode="decimal"
                              placeholder="1ª leitura"
                              className="w-24 rounded-field bg-campo px-2.5 py-1.5 text-right outline-none focus:bg-superficie focus:ring-2"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {readOnly ? (
                            <span className="inline-flex items-center gap-1 tabular-nums text-tinta">
                              {row.isLocked && <Lock size={12} strokeWidth={2} aria-label="Conta já enviada" className="text-tinta-suave" />}
                              {formatReading(row.currentReading) || "–"}
                            </span>
                          ) : (
                            <input
                              aria-label={`Leitura atual de ${row.buildingName} ${row.unitNumber}`}
                              value={typed?.current ?? formatReading(row.currentReading)}
                              onChange={(event) => type(row.unitId, "current", event.target.value)}
                              inputMode="decimal"
                              className={`w-28 rounded-field px-2.5 py-1.5 text-right tabular-nums outline-none focus:ring-2 ${values.error ? "bg-vermelho-suave text-vermelho" : "bg-campo focus:bg-superficie"}`}
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {values.error ? (
                            <span className="text-[12px] font-semibold text-vermelho">{values.error}</span>
                          ) : values.consumption != null ? (
                            <span className={`inline-flex items-center gap-1 ${isUnusual ? "font-semibold text-ambar" : "text-tinta"}`}>
                              {isUnusual && <TriangleAlert size={13} strokeWidth={2} aria-label="Acima do normal" />}
                              {formatReading(values.consumption)} {info.unit}
                            </span>
                          ) : (
                            <span className="text-tinta-suave">–</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-tinta">{values.amount != null ? formatCurrency(values.amount) : "–"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-tinta-suave">
              Total do mês: <span className="font-semibold tabular-nums text-tinta">{formatCurrency(monthTotal)}</span>. Consumo em âmbar = mais que o dobro da média recente. Depois que
              a conta é enviada, a leitura fica travada.
            </p>
            {canEdit && (
              <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…" disabled={changedRows.length === 0 || hasErrors}>
                Salvar leituras{changedRows.length > 0 ? ` (${changedRows.length})` : ""}
              </Button>
            )}
          </div>
        </>
      )}

      {isRatesOpen && activeCondominiumId && <UtilityRatesModal condominiumId={activeCondominiumId} onClose={() => setIsRatesOpen(false)} onSaved={reload} />}
    </>
  );
}
