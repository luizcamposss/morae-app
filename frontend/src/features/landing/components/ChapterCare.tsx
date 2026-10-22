import { Check } from "lucide-react";
import { Chapter, SceneHalo } from "./Chapter";

type CareEvent = { label: string; tone: "verde" | "ambar" | "neutro"; done?: boolean; what: string };

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const WEEKS = [
  [12, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25],
];
const TODAY = 17;
const WEEKEND = new Set([18, 25]);

const diarista: CareEvent = { label: "Joana · 8h", tone: "neutro", what: "Visita recorrente · diarista, seg e qui" };
const events: Record<number, CareEvent> = {
  12: diarista,
  13: { label: "Caixa d’água", tone: "verde", done: true, what: "Limpeza da caixa d’água · feita" },
  15: diarista,
  16: { label: "Lâmpada hall", tone: "ambar", what: "Ocorrência · lâmpada do hall em andamento" },
  19: diarista,
  20: { label: "Elevador · 14h", tone: "verde", what: "Manutenção preventiva do elevador" },
  22: diarista,
  24: { label: "AVCB vence", tone: "ambar", what: "AVCB vence no dia 24" },
};

const toneClasses = {
  verde: { pill: "bg-verde-suave text-verde-tinta", dot: "bg-verde" },
  ambar: { pill: "bg-ambar-suave text-ambar", dot: "bg-ambar" },
  neutro: { pill: "bg-campo text-tinta", dot: "bg-tinta-suave" },
};

export function ChapterCare() {
  return (
    <Chapter
      id="cuidar"
      number="04"
      reversed
      textWidth={420}
      title={<>Nada fica <span className="text-verde">esquecido</span>.</>}
      text="Manutenção, visitas e chamados com prazo, aviso e registro."
    >
      <div className="relative mx-auto w-full max-w-[780px]">
        <SceneHalo className="-inset-x-28 -inset-y-32" />
        <article className="relative flex flex-col gap-4 rounded-card bg-superficie p-4 shadow-[0_24px_56px_-6px_rgb(5_26_26/0.16)] sm:p-7 sm:pb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[22px] font-bold leading-tight text-tinta">Agenda do condomínio</h3>
              <p className="text-[13px] font-medium text-tinta-suave">12 a 25 de outubro</p>
            </div>
            <p className="shrink-0 whitespace-nowrap pt-1 text-[10px] font-semibold tracking-[0.06em] text-tinta-suave sm:text-[11px]">DADOS DE EXEMPLO</p>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-[10px] font-semibold tracking-[0.06em] text-tinta-suave sm:text-[11px]">
                {day}
              </span>
            ))}
            {WEEKS.flat().map((day) => {
              const event = events[day];
              const today = day === TODAY;
              return (
                <div
                  key={day}
                  className={`flex h-16 flex-col gap-1.5 rounded-[10px] p-1.5 sm:h-[92px] sm:p-2 ${today ? "ring-2 ring-inset ring-tinta" : "ring-1 ring-inset ring-linha"}`}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={`font-display text-[14px] font-bold tabular-nums sm:text-[16px] ${WEEKEND.has(day) ? "text-tinta-suave" : "text-tinta"}`}>{day}</span>
                    {today && <span className="rounded-full bg-tinta px-1.5 py-px text-[10px] font-semibold text-white">hoje</span>}
                  </span>
                  {event && (
                    <>
                      <span className={`hidden items-center gap-1 rounded-[6px] px-1.5 py-1 text-[10.5px] font-semibold leading-tight md:flex ${toneClasses[event.tone].pill}`}>
                        {event.label}
                        {event.done && <Check size={11} strokeWidth={3} aria-label="feita" />}
                      </span>
                      <span aria-hidden className={`mt-auto h-1.5 w-full rounded-full md:hidden ${toneClasses[event.tone].dot}`} />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* On small screens the pills become color bars; the events are listed here. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {Object.entries(events)
              .filter(([, event], index, all) => all.findIndex(([, other]) => other === event) === index)
              .map(([day, event]) => (
                <li key={day} className="flex items-center gap-2.5 text-[13px] text-tinta">
                  <span className={`size-2 shrink-0 rounded-full ${toneClasses[event.tone].dot}`} />
                  {event.what}
                </li>
              ))}
          </ul>

          <div className="h-px bg-linha" />
          <p className="flex items-center gap-2.5 text-[13px] font-medium text-tinta">
            <span className="size-2 shrink-0 rounded-full bg-ambar" />
            Renovação do AVCB em 7 dias · aviso enviado 30 e 7 dias antes
          </p>
        </article>
      </div>
    </Chapter>
  );
}
