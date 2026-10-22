// Charges panel with the unit grid (example data): every unit of the tower, colored by status.
type UnitGridPanelProps = {
  title: string;
  selectedUnit: string;
  // wide: hero version (number beside the grid) · compact: chapter version (grid below the number).
  variant: "wide" | "compact";
  className?: string;
};

const FLOORS = [6, 5, 4, 3, 2, 1];
const DUE_SOON = new Set(["605", "507", "208", "110"]);
const LATE = new Set(["503", "409", "204"]);

const legend = [
  { label: "Pago", color: "bg-verde" },
  { label: "Vence esta semana", color: "bg-ambar" },
  { label: "Atrasado", color: "bg-vermelho" },
];

export function UnitGridPanel({ title, selectedUnit, variant, className = "" }: UnitGridPanelProps) {
  const wide = variant === "wide";

  const grid = (
    <div className={`grid grid-cols-10 ${wide ? "gap-1.5" : "gap-1 sm:gap-1.5"}`} role="img" aria-label="Grade de unidades por situação de pagamento">
      {FLOORS.flatMap((floor) =>
        Array.from({ length: 10 }, (_, index) => {
          const unit = `${floor}${String(index + 1).padStart(2, "0")}`;
          const tone =
            unit === selectedUnit
              ? "bg-verde text-white ring-2 ring-inset ring-tinta"
              : LATE.has(unit)
                ? "bg-vermelho-suave text-vermelho"
                : DUE_SOON.has(unit)
                  ? "bg-ambar-suave text-ambar"
                  : "bg-verde-suave text-verde-tinta";
          return (
            <span
              key={unit}
              className={`grid place-items-center rounded-[3px] font-semibold tabular-nums ${tone} ${wide ? "h-[38px] text-[12px]" : "h-[26px] text-[9px] sm:h-[30px] sm:text-[11px]"}`}
            >
              {unit}
            </span>
          );
        }),
      )}
    </div>
  );

  return (
    <div
      className={`rounded-2xl border border-linha bg-superficie shadow-[0_30px_60px_-14px_rgb(15_61_62/0.1)] ${wide ? "px-9 py-8" : "p-5 sm:p-7"} ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className={`min-w-0 truncate font-semibold text-tinta ${wide ? "text-[16px]" : "text-[14px] sm:text-[15px]"}`}>{title}</p>
        <p className="shrink-0 whitespace-nowrap text-[10px] font-semibold tracking-[0.06em] text-tinta-suave sm:text-[11px]">DADOS DE EXEMPLO</p>
      </div>

      {wide ? (
        <div className="mt-6 flex gap-10">
          <div className="w-[280px] shrink-0">
            <p className="font-display text-[96px] font-bold leading-none tracking-[-0.04em] text-verde tabular-nums">53/60</p>
            <p className="mt-1.5 text-[17px] font-medium text-tinta-suave">unidades em dia</p>
          </div>
          <div className="flex-1">{grid}</div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-end gap-4">
            <p className="font-display text-[56px] font-bold leading-[0.9] tracking-[-0.04em] text-verde tabular-nums sm:text-[72px]">53/60</p>
            <p className="pb-1 text-[13px] font-medium leading-[1.4] text-tinta-suave sm:text-[15px]">
              unidades em dia
              <br />7 lembretes enviados hoje
            </p>
          </div>
          <div className="mt-6">{grid}</div>
          <ul className="mt-6 flex flex-wrap gap-x-[18px] gap-y-2">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-[12px] font-medium text-tinta-suave">
                <span className={`size-2 rounded-[2px] ${item.color}`} />
                {item.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
