import { useState, type ReactNode } from "react";
import { Lock, Paperclip } from "lucide-react";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { ITEM_OUTCOME, VOTE_TYPE, outcomeMeta, phaseMeta, quorumLabel } from "./assemblyMeta";
import { downloadOptionAttachment } from "./assemblyService";
import type { AssemblyItemResponse, AssemblyItemResult, AssemblyOptionResponse, AssemblyPhase } from "./types";

export function PhaseChip({ phase }: { phase: AssemblyPhase }) {
  const meta = phaseMeta[phase];
  return <span className={`shrink-0 whitespace-nowrap rounded-chip px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>;
}

// "em anexo": downloads the option's file (e.g. a company's budget) with the user's session.
export function OptionAttachmentLink({ optionId, fileName }: { optionId: number; fileName: string | null }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  function handleClick() {
    setState("loading");
    downloadOptionAttachment(optionId, fileName)
      .then(() => setState("idle"))
      .catch(() => setState("error"));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      title={fileName ?? undefined}
      aria-label={`Baixar o anexo${fileName ? ` ${fileName}` : ""}`}
      className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-field px-1.5 text-[13px] font-semibold text-verde-tinta transition-colors hover:bg-verde-suave disabled:cursor-progress"
    >
      {state === "loading" ? <MoraeMark size={13} motion="respiro" /> : <Paperclip size={13} strokeWidth={2} aria-hidden />}
      {state === "error" ? <span className="text-vermelho">não abriu, tente de novo</span> : "em anexo"}
    </button>
  );
}

// Read-only item of the agenda (before the result). The management passes `optionAction`
// to show the attachment controls of each option while it is a draft.
export function ItemCard({ item, optionAction }: { item: AssemblyItemResponse; optionAction?: (option: AssemblyOptionResponse) => ReactNode }) {
  const options = item.voteType === VOTE_TYPE.multipleChoice ? item.options.filter((option) => !option.isAbstention) : [];
  const asRows = Boolean(optionAction) || options.some((option) => option.hasAttachment);

  return (
    <li className="rounded-card bg-superficie p-5 shadow-whisper">
      <ItemHeading order={item.order} title={item.title} />
      {item.description && <p className="mt-2 whitespace-pre-line text-sm text-tinta-suave">{item.description}</p>}
      {options.length > 0 &&
        (asRows ? (
          <ul className="mt-3 flex flex-col gap-1.5">
            {options.map((option) => (
              <li key={option.id} className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-field bg-campo py-1.5 pl-3.5 pr-1.5 text-sm font-medium text-tinta">
                <span className="min-w-0 flex-1 break-words">{option.text}</span>
                {optionAction ? optionAction(option) : option.hasAttachment && <OptionAttachmentLink optionId={option.id} fileName={option.attachmentFileName} />}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {options.map((option) => (
              <li key={option.id} className="rounded-chip bg-campo px-2.5 py-1 text-[13px] font-medium text-tinta">
                {option.text}
              </li>
            ))}
          </ul>
        ))}
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
                <span className="flex min-w-0 flex-wrap items-center gap-x-1">
                  <span className={isWinner ? "font-semibold text-tinta" : option.isAbstention ? "text-tinta-suave" : "text-tinta"}>{option.text}</span>
                  {option.hasAttachment && <OptionAttachmentLink optionId={option.optionId} fileName={option.attachmentFileName} />}
                </span>
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
