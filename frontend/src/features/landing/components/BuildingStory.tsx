import type { ReactNode } from "react";
import { Building } from "./Building";
import { FitStage } from "./FitStage";

// Annotated building scene shared by "Antes do Moraê" and "Depois do Moraê".
// Positions come from the 1440px Figma frame of each section (section coordinates).

export type StoryNote = {
  x: number;
  y: number;
  content: ReactNode;
};

// One hand-drawn arrow: where its frame sits and the curve + head paths inside it.
export type StoryArrow = { x: number; y: number; curve: [number, number, string]; head: [number, number, string] };

type BuildingStoryProps = {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  state: "antes" | "depois";
  // Section y where the drawing area starts (bottom of the heading in the design).
  originY: number;
  notes: StoryNote[];
  arrows: StoryArrow[];
  footer?: ReactNode;
};

const STAGE_WIDTH = 1440;
const BUILDING = { x: 432, y: 328, scale: 0.9 };
const SIDEWALK_Y = 1048;

export function BuildingStory({ id, eyebrow, title, state, originY, notes, arrows, footer }: BuildingStoryProps) {
  const stageHeight = SIDEWALK_Y + 22 - originY;

  return (
    <section id={id} className="overflow-hidden bg-superficie pb-[72px] pt-20 lg:pb-[110px] lg:pt-[110px]">
      <header className="mx-auto flex max-w-[820px] flex-col items-center gap-4 px-4 text-center">
        <p className="text-[14px] font-semibold tracking-[0.1em] text-verde">{eyebrow}</p>
        <h2 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.02em] text-tinta max-lg:text-balance">
          {title}
        </h2>
      </header>

      {/* Desktop: the full annotated scene, scaled from the design. */}
      <div className="hidden lg:block">
        <FitStage width={STAGE_WIDTH} height={stageHeight}>
          <div
            aria-hidden
            className="absolute left-[170px] h-[900px] w-[1100px] rounded-full bg-[radial-gradient(closest-side,rgb(237_240_234)_0%,rgb(237_240_234/0.6)_60%,transparent_100%)]"
            style={{ top: 208 - originY }}
          />
          {/* The sidewalk runs past the scene to both edges of the screen. */}
          <div aria-hidden className="absolute left-[-1280px] h-[22px] w-[4000px] bg-fundo" style={{ top: SIDEWALK_Y - originY }} />
          <BuildingAt state={state} originY={originY} />
          <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={STAGE_WIDTH} height={stageHeight}>
            {arrows.map((arrow, index) => (
              <g key={index} transform={`translate(${arrow.x} ${arrow.y - originY})`} className="text-tinta-suave" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path transform={`translate(${arrow.curve[0]} ${arrow.curve[1]})`} d={arrow.curve[2]} strokeDasharray="4 4" />
                <path transform={`translate(${arrow.head[0]} ${arrow.head[1]})`} d={arrow.head[2]} />
              </g>
            ))}
          </svg>
          {notes.map((note, index) => (
            <div key={index} className="absolute whitespace-nowrap" style={{ left: note.x, top: note.y - originY }}>
              {note.content}
            </div>
          ))}
        </FitStage>
      </div>

      {/* Phone and tablet: the building on its own, the notes listed below it. */}
      <div className="mx-auto mt-10 max-w-[680px] px-4 lg:hidden">
        <div className="mx-auto max-w-[420px]">
          <FitStage width={640} height={810}>
            <Building state={state} />
          </FitStage>
        </div>
        <div aria-hidden className="-mx-4 h-4 bg-fundo" />
        <div className="mx-auto mt-8 flex max-w-[460px] flex-col gap-3">
          {notes.map((note, index) => (
            <div key={index} className="[&>*]:w-full [&>*]:max-w-none">
              {note.content}
            </div>
          ))}
        </div>
      </div>

      {footer && <div className="mt-14 flex justify-center px-4 lg:mt-[70px]">{footer}</div>}
    </section>
  );
}

function BuildingAt({ state, originY }: { state: "antes" | "depois"; originY: number }) {
  return (
    <div
      className="absolute origin-top-left"
      style={{ left: BUILDING.x, top: BUILDING.y - originY, transform: `scale(${BUILDING.scale})` }}
    >
      <Building state={state} />
    </div>
  );
}
