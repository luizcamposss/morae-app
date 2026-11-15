import { useEffect, useState } from "react";
import { formatCurrency } from "../../shared/lib/currency";
import { getMyConsumption, utilityInfo, type ConsumptionHistory } from "./consumptionService";

const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const shortMonth = (month: string) => monthShort.format(new Date(`${month}-01T00:00:00Z`)).replace(".", "");

// Resident: consumption of the last 12 months per utility, with this month against the previous one.
export function ConsumptionCard({ condominiumUnitIds }: { condominiumUnitIds?: number[] }) {
  const [histories, setHistories] = useState<ConsumptionHistory[]>([]);

  useEffect(() => {
    let isMounted = true;
    getMyConsumption()
      .then((result) => isMounted && setHistories(result))
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  const shown = histories.filter((history) => history.months.length > 0 && (!condominiumUnitIds || condominiumUnitIds.includes(history.unitId)));
  if (shown.length === 0) return null;
  const showUnit = new Set(shown.map((history) => history.unitId)).size > 1;

  return (
    <section className="mt-8">
      <h2 className="mb-3 px-1 text-sm font-semibold text-tinta-suave">Seu consumo</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((history) => {
          const info = utilityInfo(history.category);
          const last = history.months[history.months.length - 1];
          const before = history.months[history.months.length - 2];
          const max = Math.max(...history.months.map((month) => month.consumption), 0.001);
          const change = before && before.consumption > 0 ? Math.round(((last.consumption - before.consumption) / before.consumption) * 100) : null;
          return (
            <article key={`${history.unitId}-${history.category}`} className="rounded-card bg-superficie p-5 shadow-whisper">
              <header className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-tinta">
                  {info.label}
                  {showUnit && <span className="font-normal text-tinta-suave"> · {history.unitLabel}</span>}
                </h3>
                <span className="text-[13px] tabular-nums text-tinta-suave">{formatCurrency(last.amount)}</span>
              </header>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-tinta">
                {last.consumption.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {info.unit}
                <span className="ml-2 align-middle text-[13px] font-semibold">
                  {change == null ? null : change > 0 ? <span className="text-ambar">+{change}% que o mês anterior</span> : <span className="text-verde-tinta">{change}% que o mês anterior</span>}
                </span>
              </p>
              <div className="mt-4 flex h-24 items-end gap-1.5" role="img" aria-label={`Consumo de ${info.label.toLowerCase()} nos últimos meses`}>
                {history.months.map((month) => (
                  <div key={month.month} className="flex h-full max-w-12 flex-1 flex-col justify-end">
                    <div
                      className={`w-full rounded-t-[4px] ${month === last ? "bg-verde" : "bg-linha"}`}
                      style={{ height: `${Math.max((month.consumption / max) * 100, 4)}%` }}
                      title={`${shortMonth(month.month)}: ${month.consumption.toLocaleString("pt-BR")} ${info.unit}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-1.5">
                {history.months.map((month) => (
                  <span key={month.month} className="max-w-12 flex-1 text-center text-[11px] text-tinta-suave">
                    {shortMonth(month.month)}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
