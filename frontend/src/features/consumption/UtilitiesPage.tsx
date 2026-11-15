import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { todayInputDate } from "../../shared/lib/date";
import { parseCurrencyInput } from "../adminPayments/chargeForm";
import { MonthNavigator } from "../expenses/MonthNavigator";
import { monthLabel, monthOf, shiftMonth } from "../expenses/expenseMeta";
import { useIsSyndicArea, useSyndicCan } from "../syndicAccess/useSyndicAccess";
import { UTILITIES, getUtilityMonth, saveUtilityMonth, saveUtilitySettings, type Utility, type UtilityMonth } from "./consumptionService";

// What was typed, per unit and utility ("" = nothing this month).
type Draft = Record<string, string>;
const key = (unitId: number, utility: Utility) => `${unitId}-${utility}`;
const toText = (amount: number) => amount.toFixed(2).replace(".", ",");

// "Água, luz e gás": the management types each unit's amounts of the month in R$ (#209). They go into
// the monthly bill of whoever pays the unit's condominium bills (the tenant or the owner).
export function UtilitiesPage() {
  const { activeCondominium, activeCondominiumId } = useCondominium();
  const isSyndic = useIsSyndicArea();
  const canEdit = useSyndicCan("charges.create");
  const currentMonth = monthOf(todayInputDate());
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<{ key: string; month: UtilityMonth | null; error: string } | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadKey = `${activeCondominiumId}-${month}-${reloadKey}`;
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;
    getUtilityMonth(activeCondominiumId, month)
      .then((result) => {
        if (!isMounted) return;
        setData({ key: loadKey, month: result, error: "" });
        setDraft({});
      })
      .catch((error) => isMounted && setData({ key: loadKey, month: null, error: error instanceof Error ? error.message : "Não foi possível carregar os valores." }));
    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, month, loadKey]);

  const isLoading = data?.key !== loadKey;
  const utilities = useMemo(() => data?.month?.utilities ?? [], [data]);
  const rows = isLoading ? [] : (data?.month?.rows ?? []);
  const changed = Object.keys(draft);

  function stored(unitId: number, utility: Utility) {
    return rows.find((row) => row.unitId === unitId)?.amounts.find((item) => item.category === utility);
  }

  function shown(unitId: number, utility: Utility) {
    const typed = draft[key(unitId, utility)];
    if (typed !== undefined) return typed;
    const amount = stored(unitId, utility)?.amount;
    return amount ? toText(amount) : "";
  }

  const total = rows.reduce(
    (sum, row) => sum + utilities.reduce((rowSum, utility) => rowSum + (parseCurrencyInput(shown(row.unitId, utility)) || 0), 0),
    0,
  );

  async function toggleUtility(utility: Utility) {
    if (!activeCondominiumId) return;
    const next = utilities.includes(utility) ? utilities.filter((item) => item !== utility) : [...utilities, utility];
    try {
      await saveUtilitySettings(activeCondominiumId, next);
      reload();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível salvar." });
    }
  }

  async function handleSave() {
    if (!activeCondominiumId || changed.length === 0) return;
    const amounts = changed.map((entry) => {
      const [unitId, utility] = entry.split("-").map(Number);
      const text = draft[entry].trim();
      return { unitId, category: utility as Utility, amount: text ? parseCurrencyInput(text) : null };
    });
    if (amounts.some((item) => item.amount !== null && !(item.amount >= 0))) {
      setFeedback({ tone: "error", text: "Confira os valores: use números, como 90,50." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await saveUtilityMonth(activeCondominiumId, month, amounts);
      setFeedback({ tone: "ok", text: `Valores salvos · ${formatCurrency(result.total)} nas contas de ${monthLabel(month)}.` });
      reload();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível salvar." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Água, luz e gás" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <MonthNavigator month={month} maxMonth={shiftMonth(currentMonth, 1)} onChange={setMonth} />
        {!isSyndic && data?.month && (
          <div role="group" aria-label="O que o condomínio cobra" className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <span className="text-[13px] text-tinta-suave">Cobra:</span>
            {UTILITIES.map((utility) => {
              const isOn = utilities.includes(utility.value);
              return (
                <button
                  key={utility.value}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => void toggleUtility(utility.value)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${isOn ? "bg-tinta text-white" : "bg-campo text-tinta-suave hover:text-tinta"}`}
                >
                  {utility.label}
                </button>
              );
            })}
          </div>
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

      {!isLoading && utilities.length === 0 ? (
        <p className="rounded-card bg-campo px-6 py-10 text-center text-sm text-tinta-suave">
          {isSyndic ? "A administração ainda não escolheu o que o condomínio cobra por unidade." : "Escolha acima o que o condomínio cobra por unidade: água, luz ou gás."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card bg-superficie shadow-whisper">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-linha text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-tinta-suave">
                  <th className="px-4 py-3">Unidade</th>
                  {utilities.map((utility) => (
                    <th key={utility} className="px-4 py-3 text-right">
                      {UTILITIES.find((item) => item.value === utility)?.label} (R$)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {isLoading ? (
                  <tr>
                    <td colSpan={utilities.length + 1} className="px-4 py-10 text-center text-tinta-suave">
                      Carregando…
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.unitId}>
                      <td className="px-4 py-2.5">
                        <span className="block font-semibold text-tinta">
                          {row.buildingName} · {row.unitNumber}
                        </span>
                        <span className="block text-[12px] text-tinta-suave">{row.payerName ? `Para ${row.payerName}` : "Ninguém vinculado"}</span>
                      </td>
                      {utilities.map((utility) => {
                        const item = stored(row.unitId, utility);
                        const isLocked = item?.isLocked ?? false;
                        const label = `${UTILITIES.find((entry) => entry.value === utility)?.label} de ${row.buildingName} ${row.unitNumber}`;
                        return (
                          <td key={utility} className="px-4 py-2.5 text-right">
                            {isLocked || !canEdit ? (
                              <span className="inline-flex items-center gap-1 tabular-nums text-tinta">
                                {isLocked && <Lock size={12} strokeWidth={2} aria-label="Conta já enviada" className="text-tinta-suave" />}
                                {item ? formatCurrency(item.amount) : "–"}
                              </span>
                            ) : (
                              <input
                                aria-label={label}
                                value={shown(row.unitId, utility)}
                                onChange={(event) => {
                                  setFeedback(null);
                                  setDraft((current) => ({ ...current, [key(row.unitId, utility)]: event.target.value.replace(/[^\d.,]/g, "") }));
                                }}
                                inputMode="decimal"
                                placeholder="0,00"
                                className="w-28 rounded-field bg-campo px-2.5 py-1.5 text-right tabular-nums outline-none focus:bg-superficie focus:ring-2"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-tinta-suave">
              Total do mês: <span className="font-semibold tabular-nums text-tinta">{formatCurrency(total)}</span>. Cada valor entra na conta do mês de quem paga a unidade.
              Depois que a conta sai, o valor trava.
            </p>
            {canEdit && (
              <Button onClick={() => void handleSave()} isLoading={isSaving} loadingText="Salvando…" disabled={changed.length === 0}>
                Salvar{changed.length > 0 ? ` (${changed.length})` : ""}
              </Button>
            )}
          </div>
        </>
      )}
    </>
  );
}
