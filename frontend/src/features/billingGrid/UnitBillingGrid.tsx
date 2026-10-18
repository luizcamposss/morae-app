import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { currentMonthName } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import type { UnitResponse } from "../units/types";
import { STATUS_ORDER, buildBillingGrid, buildUnitStatuses, type UnitBillingStatus } from "./unitBillingGrid";

type UnitBillingGridProps = {
  units: UnitResponse[];
  charges: ChargeResponse[];
  // Payments screen of the area ("/admin/payments" or "/syndic/payments"); gets ?unit=<id>.
  paymentsPath: string;
  isLoading: boolean;
};

const statusMeta: Record<UnitBillingStatus, { label: string; tile: string; dot: string }> = {
  paid: { label: "Paga", tile: "bg-verde-suave text-verde-tinta hover:ring-verde", dot: "bg-verde" },
  dueSoon: { label: "Vence esta semana", tile: "bg-ambar-suave text-ambar hover:ring-ambar", dot: "bg-ambar" },
  overdue: { label: "Atrasada", tile: "bg-vermelho-suave text-vermelho hover:ring-vermelho", dot: "bg-vermelho" },
  open: { label: "Em aberto", tile: "bg-superficie text-tinta ring-1 ring-inset ring-tinta-suave/35 hover:ring-tinta", dot: "bg-superficie ring-1 ring-inset ring-tinta-suave/50" },
  none: { label: "Sem cobrança", tile: "bg-campo text-tinta-suave/70 hover:ring-tinta-suave/40", dot: "bg-campo ring-1 ring-inset ring-linha" },
};

// "Cobranças de outubro": one square per unit colored by this month's charge, by building and floor.
// Units come already limited by the API (a syndic only sees the buildings he manages).
export function UnitBillingGrid({ units, charges, paymentsPath, isLoading }: UnitBillingGridProps) {
  const buildings = useMemo(() => buildBillingGrid(units, buildUnitStatuses(charges)), [units, charges]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const building = buildings.find((item) => item.id === selectedId) ?? buildings[0];

  const total = units.length;
  const upToDate = buildings.reduce((sum, item) => sum + item.upToDate, 0);
  const counts = useMemo(() => {
    const result: Record<UnitBillingStatus, number> = { paid: 0, dueSoon: 0, overdue: 0, open: 0, none: 0 };
    building?.floors.forEach((floor) => floor.units.forEach((unit) => (result[unit.status] += 1)));
    return result;
  }, [building]);
  const hasFloors = building?.floors.some((floor) => floor.floor !== null);

  return (
    <section className="min-w-0" aria-labelledby="billing-grid-title">
      <h2 id="billing-grid-title" className="mb-3 font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">
        Cobranças de {currentMonthName()}
        <span className="ml-2 font-sans text-[13px] font-normal tracking-normal text-tinta-suave">por unidade</span>
      </h2>

      <div className="rounded-card bg-superficie p-5 shadow-whisper sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <p className="font-display text-[30px] font-bold leading-none tabular-nums text-tinta">
            {isLoading ? "–" : `${upToDate}/${total}`}
            <span className="ml-1.5 font-sans text-sm font-normal text-tinta-suave">unidades em dia</span>
          </p>
        </div>

        {buildings.length > 1 && (
          <div className="-mx-5 mt-5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-6 sm:px-6">
            <div role="tablist" aria-label="Prédio" className="inline-flex gap-1">
              {buildings.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === building?.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    item.id === building?.id ? "bg-tinta text-white" : "text-tinta-suave hover:bg-menu hover:text-tinta"
                  }`}
                >
                  {item.name}
                  <span className={`text-xs font-medium tabular-nums ${item.id === building?.id ? "text-white/75" : "text-tinta-suave"}`}>
                    {item.upToDate}/{item.total}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-tinta-suave" aria-label="Legenda">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span aria-hidden className={`size-3 rounded-[3px] ${statusMeta[status].dot}`} />
              {statusMeta[status].label}
              {!isLoading && building && <span className="font-semibold tabular-nums text-tinta">{counts[status]}</span>}
            </li>
          ))}
        </ul>

        {isLoading ? (
          <div className="mt-4 h-32 animate-pulse rounded-block bg-campo" aria-label="Carregando unidades" />
        ) : !building ? (
          <p className="mt-4 rounded-block bg-campo px-4 py-6 text-center text-sm text-tinta-suave">Nenhuma unidade cadastrada.</p>
        ) : (
          <div className={`mt-4 ${building.floors.length > 12 ? "max-h-[28rem] overflow-y-auto pr-1" : ""}`}>
            <ol className="flex flex-col gap-1.5" aria-label={`Unidades de ${building.name}`}>
              {building.floors.map((floor) => (
                <li key={floor.floor ?? "all"} className="flex items-start gap-2">
                  {hasFloors && (
                    <span className="w-8 shrink-0 pt-2 text-right text-[11px] font-semibold tabular-nums text-tinta-suave" aria-label={`${floor.floor}º andar`}>
                      {floor.floor}º
                    </span>
                  )}
                  <ul className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
                    {floor.units.map((unit) => {
                      const meta = statusMeta[unit.status];
                      return (
                        <li key={unit.id}>
                          <Link
                            to={`${paymentsPath}?unit=${unit.id}`}
                            title={`${unit.number} · ${meta.label}`}
                            aria-label={`Unidade ${unit.number}: ${meta.label}. Ver cobranças`}
                            className={`grid h-8 place-items-center truncate rounded-[6px] px-0.5 text-[11px] font-semibold tabular-nums transition-shadow hover:ring-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-verde ${meta.tile}`}
                          >
                            {unit.number}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
