import { Check } from "lucide-react";

// The "Edifício Jardim" drawing, in the 640×760 coordinates of the Figma frame.
// "antes": the condominium without Moraê (late units, paper notice, empty hall, tank overdue).
// "depois": everything settled (all units paid, hall full, tank done).
type BuildingProps = { state: "antes" | "depois"; className?: string };

const FLOORS = [6, 5, 4, 3, 2, 1];
const COLUMNS = [1, 2, 3, 4, 5];
const LATE_UNITS = new Set(["601", "503", "402", "301", "205", "104"]);
const JUST_PAID = "301";

export function Building({ state, className = "" }: BuildingProps) {
  const after = state === "depois";
  let plainWindows = 0;

  return (
    <div aria-hidden className={`relative h-[760px] w-[640px] ${className}`}>
      {/* Water tank and its status badge */}
      <div className="absolute left-[450px] top-[52px] h-[44px] w-[80px] rounded-t-[4px] border-[1.5px] border-tinta bg-superficie" />
      <span
        className={`absolute left-[518px] top-[40px] grid size-6 place-items-center rounded-full border-2 border-superficie text-white ${after ? "bg-verde" : "bg-ambar"}`}
      >
        {after ? <Check size={13} strokeWidth={3} /> : <span className="font-display text-[14px] font-bold leading-none">!</span>}
      </span>
      <div className="absolute left-[68px] top-[96px] h-[14px] w-[524px] rounded-[3px] bg-tinta" />

      <div className="absolute left-[80px] top-[110px] h-[690px] w-[500px] rounded-t-[6px] border-[1.5px] border-tinta bg-superficie shadow-float" />

      {FLOORS.map((floor, row) => {
        const top = 110 + row * 100;
        return (
          <div key={floor}>
            {row > 0 && <div className="absolute left-[80px] h-px w-[500px] bg-linha" style={{ top }} />}
            <div className="absolute left-[60px] h-px w-3 bg-tinta-suave" style={{ top }} />
            <span className="absolute left-[34px] text-[12px] font-medium text-tinta-suave" style={{ top: top + 43 }}>
              {floor}º
            </span>
            {COLUMNS.map((column, index) => {
              const unit = `${floor}0${column}`;
              const late = !after && LATE_UNITS.has(unit);
              const justPaid = after && unit === JUST_PAID;
              const hasCurtain = !LATE_UNITS.has(unit) && plainWindows++ % 3 === 0;
              const tone = justPaid
                ? "border-2 border-verde bg-verde text-white shadow-[0_0_22px_2px_rgb(0_174_84/0.45)]"
                : after
                  ? "border border-verde bg-verde-suave text-verde-tinta"
                  : late
                    ? "border border-vermelho bg-vermelho-suave text-vermelho"
                    : "border border-linha bg-superficie text-tinta-suave";

              return (
                <div
                  key={unit}
                  className={`absolute h-[54px] w-[72px] overflow-hidden rounded-[6px] ${tone}`}
                  style={{ left: 120 + index * 87, top: top + 24 }}
                >
                  {hasCurtain && !justPaid && (
                    <span className={`absolute left-[3px] top-[3px] h-[46px] w-[30px] rounded-[3px] ${after ? "bg-[#d3eedd]" : "bg-campo"}`} />
                  )}
                  <span className="absolute bottom-[6px] left-2 text-[12px] font-semibold leading-none">{unit}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Ground floor: party hall, door, sign and the paper notice of the "before" */}
      <div className="absolute left-[80px] top-[710px] h-[1.5px] w-[500px] bg-tinta" />
      <div className="absolute left-[108px] top-[730px] h-[52px] w-[130px] rounded-[4px] border-[1.5px] border-tinta bg-campo">
        <span className="absolute left-2 top-1.5 text-[10px] font-semibold tracking-[0.12em] text-tinta-suave">SALÃO</span>
        <span className={`absolute top-[30px] flex gap-[3px] ${after ? "left-3" : "left-[84px]"}`}>
          {Array.from({ length: after ? 8 : 2 }, (_, guest) => (
            <span key={guest} className={`size-[9px] rounded-full ${after ? "bg-verde" : "bg-tinta-suave"} ${after ? "" : "mr-[4px]"}`} />
          ))}
        </span>
      </div>
      <span className="absolute left-[330px] top-[720px] -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tracking-[0.12em] text-tinta">
        EDIFÍCIO JARDIM
      </span>
      <div className="absolute left-[292px] top-[738px] h-[62px] w-[76px] rounded-t-[4px] border-[1.5px] border-tinta bg-campo" />
      {!after && (
        <>
          <div className="absolute left-[402px] top-[726px] h-[58px] w-[74px] -rotate-[5deg] border border-linha bg-superficie p-2">
            <span className="font-display text-[11px] font-bold text-tinta">AVISO</span>
            <span className="mt-2 block h-[3px] w-14 rounded-sm bg-linha" />
            <span className="mt-[5px] block h-[3px] w-14 rounded-sm bg-linha" />
            <span className="mt-[5px] block h-[3px] w-[34px] rounded-sm bg-linha" />
          </div>
          <div className="absolute left-[424px] top-[721px] h-[10px] w-[30px] bg-ambar-suave/90" />
        </>
      )}
      <div className="absolute left-0 top-[800px] h-[1.5px] w-[640px] bg-tinta" />
    </div>
  );
}
