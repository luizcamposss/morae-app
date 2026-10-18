import { Lock } from "lucide-react";
import { ITEM_OUTCOME, VOTE_TYPE, outcomeMeta, phaseMeta, quorumLabel } from "./assemblyMeta";
import type { AssemblyItemResponse, AssemblyItemResult, AssemblyPhase } from "./types";

export function PhaseChip({ phase }: { phase: AssemblyPhase }) {
  const meta = phaseMeta[phase];
  return <span className={`shrink-0 whitespace-nowrap rounded-chip px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>;
}

// Read-only item of the agenda (before the result).
export function ItemCard({ item }: { item: AssemblyItemResponse }) {
  const options = item.voteType === VOTE_TYPE.multipleChoice ? item.options.filter((option) => !option.isAbstention) : [];

  return (
    <li className="rounded-card bg-superficie p-5 shadow-whisper">
      <ItemHeading order={item.order} title={item.title} />
      {item.description && <p className="mt-2 whitespace-pre-line text-sm text-tinta-suave">{item.description}</p>}
      {options.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {options.map((option) => (
            <li key={option.id} className="rounded-chip bg-campo px-2.5 py-1 text-[13px] font-medium text-tinta">
              {option.text}
            </li>
          ))}
        </ul>
      )}
      <ItemRules voteType={item.voteType} quorum={item.quorum} isSecret={item.isSecret} />
    </li>
  );
}

export function ResultCard({ item }: { item: AssemblyItemResult }) {
  const outcome = outcomeMeta[item.outcome];
  const maxVotes = Math.max(1, ...item.options.map((option) => option.votes));
  // Yes/no items have no winner option: an approved one highlights "Sim" (always the first).
  const winnerId = item.winnerOptionId ?? (item.outcome === ITEM_OUTCOME.approved ? item.options[0]?.optionId : null);

  return (
    <li className="rounded-card bg-superficie p-5 shadow-whisper">
      <div className="flex items-start justify-between gap-3">
        <ItemHeading order={item.order} title={item.title} />
        <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${outcome.tone}`}>{outcome.label}</span>
      </div>
      <p className="mt-2 text-sm text-tinta">{item.summary}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {item.options.map((option) => {
          const isWinner = option.optionId === winnerId;
          return (
            <li key={option.optionId}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={isWinner ? "font-semibold text-tinta" : option.isAbstention ? "text-tinta-suave" : "text-tinta"}>{option.text}</span>
                <span className="tabular-nums text-tinta-suave">
                  {option.votes} {option.votes === 1 ? "voto" : "votos"}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-campo">
                <div
                  className={`h-full rounded-full ${isWinner ? "bg-verde" : option.isAbstention ? "bg-linha" : "bg-tinta-suave/40"}`}
                  style={{ width: `${(option.votes / maxVotes) * 100}%` }}
                />
              </div>
              {option.units && option.units.length > 0 && (
                <p className="mt-1 text-[13px] text-tinta-suave">{option.units.join(", ")}</p>
              )}
            </li>
          );
        })}
      </ul>
      <ItemRules voteType={item.voteType} quorum={item.quorum} isSecret={item.isSecret} />
    </li>
  );
}

export function ItemHeading({ order, title }: { order: number; title: string }) {
  return (
    <h3 className="flex min-w-0 gap-2 text-[15px] font-semibold text-tinta">
      <span className="tabular-nums text-tinta-suave">{order}.</span>
      <span className="min-w-0">{title}</span>
    </h3>
  );
}

export function ItemRules({ voteType, quorum, isSecret }: Pick<AssemblyItemResponse, "voteType" | "quorum" | "isSecret">) {
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-linha pt-3 text-[13px] text-tinta-suave">
      <span>{voteType === VOTE_TYPE.yesNo ? "Sim ou não" : "Múltipla escolha"}</span>
      <span aria-hidden>·</span>
      <span>Quórum: {quorumLabel(quorum).toLowerCase()}</span>
      {isSecret && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Lock size={13} strokeWidth={2} aria-hidden />
            Voto secreto
          </span>
        </>
      )}
    </p>
  );
}
