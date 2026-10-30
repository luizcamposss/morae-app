import { Chapter, SceneHalo } from "./Chapter";

const options = [
  { name: "Empresa A", note: "Orçamento 1 · em anexo" },
  { name: "Empresa B", note: "Orçamento 2 · em anexo" },
  { name: "Empresa C", note: "Orçamento 3 · em anexo" },
];
const CHOSEN = "Empresa B";

// Quorum ring: 38 of 60 units voted, tick at the 2/3 mark the item needs (the ring starts at the top).
const RING_RADIUS = 28;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const QUORUM_ANGLE = (2 / 3) * 2 * Math.PI;

export function ChapterDecide() {
  return (
    <Chapter
      id="decidir"
      number="03"
      textWidth={524}
      title={<>Assembleia com quórum,<br /><span className="text-verde">sem sair de casa</span>.</>}
      text="Um voto por unidade, e o quórum é calculado sozinho."
      details={<p className="text-[14px] font-medium text-tinta-suave">Segue o Código Civil: inadimplente não vota.</p>}
    >
      <div className="relative mx-auto w-full max-w-[440px] lg:mr-[60px] lg:py-10">
        <SceneHalo className="-inset-x-56 -inset-y-28" />
        <article className="relative flex flex-col gap-[18px] rounded-card bg-superficie p-6 shadow-[0_24px_56px_-6px_rgb(5_26_26/0.16)] sm:px-7 sm:pb-6 sm:pt-7">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-tinta-suave">AGO 2026 · Apto 306</span>
            <span className="rounded-chip bg-verde-suave px-2.5 py-1 text-[12px] font-semibold text-verde-tinta">Votação aberta</span>
          </div>
          <h3 className="font-display text-[30px] font-bold leading-[1.1] tracking-[-0.015em] text-tinta">Pintura da fachada: qual empresa?</h3>

          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Escolha uma empresa</legend>
            {options.map((option) => {
              const chosen = option.name === CHOSEN;
              return (
                <label
                  key={option.name}
                  className={`flex cursor-pointer items-center gap-3.5 rounded-xl px-4 py-3.5 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-verde ${chosen ? "bg-verde-suave ring-[1.5px] ring-inset ring-verde" : "bg-campo hover:bg-menu"}`}
                >
                  <input type="radio" name="fachada" defaultChecked={chosen} className="peer sr-only" />
                  <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-linha bg-superficie peer-checked:border-verde peer-checked:[&>span]:scale-100">
                    <span className="size-2.5 scale-0 rounded-full bg-verde transition-transform duration-200 ease-out-expo" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold text-tinta">{option.name}</span>
                    <span className="text-[12px] text-tinta-suave">{option.note}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <span aria-hidden className="grid h-12 place-items-center rounded-full bg-tinta text-[15px] font-semibold text-white">
            Confirmar meu voto
          </span>
          <div className="h-px bg-linha" />

          <div className="flex items-center gap-4">
            <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
              <circle cx="32" cy="32" r={RING_RADIUS} fill="none" strokeWidth="7" className="stroke-verde-suave" />
              <circle
                cx="32"
                cy="32"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="7"
                className="stroke-verde"
                strokeDasharray={`${(RING_LENGTH * 38) / 60} ${RING_LENGTH}`}
              />
              <line
                x1={32 + 22 * Math.cos(QUORUM_ANGLE)}
                y1={32 + 22 * Math.sin(QUORUM_ANGLE)}
                x2={32 + 34 * Math.cos(QUORUM_ANGLE)}
                y2={32 + 34 * Math.sin(QUORUM_ANGLE)}
                strokeWidth="3"
                strokeLinecap="round"
                className="stroke-tinta"
              />
              <text x="32" y="32" dy="0.35em" textAnchor="middle" transform="rotate(90 32 32)" className="fill-tinta font-display text-[18px] font-bold">
                38
              </text>
            </svg>
            <div className="flex flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-tinta">38 de 60 unidades votaram</p>
              <p className="text-[13px] text-tinta-suave">Faltam 2 para o quórum de 2/3 · até 20/10, 22h</p>
              <p className="text-[13px] text-tinta-suave">A parcial fica escondida até o fim.</p>
            </div>
          </div>
        </article>
      </div>
    </Chapter>
  );
}
