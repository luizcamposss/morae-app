import { useState } from "react";
import { CircleCheck, Lock, TriangleAlert } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { formatDateTime } from "../../shared/lib/date";
import { ItemCard, ItemHeading, ItemRules } from "../assemblies/AssemblyParts";
import { castVotes } from "../assemblies/assemblyService";
import type { AssemblyItemResponse, BallotUnit, MyBallot } from "../assemblies/types";

type Choices = Record<number, number>;

type AssemblyBallotProps = {
  assemblyId: number;
  items: AssemblyItemResponse[];
  ballot: MyBallot;
  votingEndsAt: string;
  onVoted: (ballot: MyBallot) => void;
};

// The ballot of each unit of the user: one choice per item, reviewed before sending and
// changeable until voting closes.
export function AssemblyBallot({ assemblyId, items, ballot, votingEndsAt, onVoted }: AssemblyBallotProps) {
  const [unitId, setUnitId] = useState(() => (ballot.units.find((unit) => unit.canVote) ?? ballot.units[0])?.unitId ?? 0);
  // Unsent choices per unit (unitId → itemId → optionId).
  const [drafts, setDrafts] = useState<Record<number, Choices>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (ballot.units.length === 0) {
    return (
      <p className="rounded-field bg-campo px-4 py-3 text-sm text-tinta-suave">
        Você não está ligado a nenhuma unidade deste condomínio, então não há cédula para você nesta assembleia.
      </p>
    );
  }

  const unit = ballot.units.find((item) => item.unitId === unitId) ?? ballot.units[0];
  const draft = drafts[unit.unitId] ?? {};
  const choices: Choices = { ...unit.votes, ...draft };
  const changed = items.filter((item) => draft[item.id] !== undefined && draft[item.id] !== unit.votes[item.id]);
  const missing = items.filter((item) => choices[item.id] === undefined).length;
  const votedCount = items.filter((item) => unit.votes[item.id] !== undefined).length;
  const hasVoted = votedCount === items.length;

  function choose(itemId: number, optionId: number) {
    setSuccessMessage("");
    setErrorMessage("");
    setDrafts((current) => ({ ...current, [unit.unitId]: { ...current[unit.unitId], [itemId]: optionId } }));
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const next = await castVotes(assemblyId, {
        unitId: unit.unitId,
        votes: changed.map((item) => ({ itemId: item.id, optionId: choices[item.id] })),
      });
      setDrafts((current) => ({ ...current, [unit.unitId]: {} }));
      setSuccessMessage(`${hasVoted ? "Voto atualizado" : "Voto registrado"}. Você pode mudar até ${formatDateTime(votingEndsAt)}.`);
      onVoted(next);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível registrar o voto.");
    } finally {
      setIsSubmitting(false);
      setIsReviewing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {ballot.units.length > 1 && (
        <div role="tablist" aria-label="Unidade" className="flex w-full overflow-x-auto rounded-block bg-menu p-1 sm:inline-flex sm:w-auto sm:self-start">
          {ballot.units.map((item) => (
            <button
              key={item.unitId}
              type="button"
              role="tab"
              aria-selected={item.unitId === unit.unitId}
              onClick={() => {
                setUnitId(item.unitId);
                setSuccessMessage("");
                setErrorMessage("");
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-field px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                item.unitId === unit.unitId ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {item.unitLabel}
              {items.every((assemblyItem) => item.votes[assemblyItem.id] !== undefined) && (
                <CircleCheck size={14} strokeWidth={2} aria-label="já votou" className="text-verde-tinta" />
              )}
            </button>
          ))}
        </div>
      )}

      <UnitStatus unit={unit} hasVoted={hasVoted} votedCount={votedCount} total={items.length} votingEndsAt={votingEndsAt} />

      {errorMessage && (
        <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {unit.canVote
          ? items.map((item) => (
              <BallotItem key={item.id} item={item} chosenId={choices[item.id]} savedId={unit.votes[item.id]} onChoose={(optionId) => choose(item.id, optionId)} />
            ))
          : items.map((item) => <ItemCard key={item.id} item={item} />)}
      </ol>

      {unit.canVote && (
        <div className="flex flex-col items-stretch gap-2 rounded-card bg-superficie p-4 shadow-whisper sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-tinta-suave">
            {missing > 0
              ? `Falta escolher em ${missing} ${missing === 1 ? "pauta" : "pautas"}.`
              : changed.length > 0
                ? `${changed.length} ${changed.length === 1 ? "escolha nova" : "escolhas novas"} para enviar.`
                : hasVoted
                  ? "Nada mudou desde o seu voto."
                  : "Tudo escolhido."}
          </p>
          <Button variant="accent" disabled={missing > 0 || changed.length === 0} onClick={() => setIsReviewing(true)}>
            {hasVoted ? "Revisar mudança" : "Revisar e votar"}
          </Button>
        </div>
      )}

      {isReviewing && (
        <Modal
          title={hasVoted ? "Confirmar mudança de voto" : "Confirmar voto"}
          description={`${unit.unitLabel} · você pode mudar até ${formatDateTime(votingEndsAt)}.`}
          onClose={() => setIsReviewing(false)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setIsReviewing(false)}>
                Voltar
              </Button>
              <Button variant="accent" isLoading={isSubmitting} loadingText="Enviando…" onClick={() => void handleConfirm()}>
                Confirmar voto
              </Button>
            </>
          }
        >
          <ol className="divide-y divide-linha rounded-field bg-campo text-sm">
            {items.map((item) => {
              const option = item.options.find((candidate) => candidate.id === choices[item.id]);
              const isChanged = changed.includes(item);
              return (
                <li key={item.id} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                  <span className="min-w-0 text-tinta-suave">
                    <span className="tabular-nums">{item.order}.</span> {item.title}
                  </span>
                  <span className={`shrink-0 text-right font-semibold ${isChanged ? "text-tinta" : "text-tinta-suave"}`}>{option?.text ?? "—"}</span>
                </li>
              );
            })}
          </ol>
          {items.some((item) => item.isSecret) && (
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-tinta-suave">
              <Lock size={13} strokeWidth={2} aria-hidden />
              Nas pautas de voto secreto, o resultado mostra só a contagem.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

function UnitStatus({ unit, hasVoted, votedCount, total, votingEndsAt }: { unit: BallotUnit; hasVoted: boolean; votedCount: number; total: number; votingEndsAt: string }) {
  if (!unit.canVote) {
    return (
      <p className="flex items-start gap-2 rounded-field bg-ambar-suave px-4 py-3 text-sm text-ambar">
        <TriangleAlert size={16} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">{unit.unitLabel} não vota nesta assembleia.</span> {unit.blockReason}
        </span>
      </p>
    );
  }

  if (votedCount === 0) return null;

  return (
    <p className={`flex items-start gap-2 rounded-field px-4 py-3 text-sm ${hasVoted ? "bg-verde-suave text-verde-tinta" : "bg-campo text-tinta"}`}>
      <CircleCheck size={16} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0" />
      <span>
        <span className="font-semibold">{hasVoted ? "Sua unidade já votou" : `Sua unidade votou em ${votedCount} de ${total} pautas`}</span>
        {unit.lastVotedByName && ` · por ${unit.lastVotedByName}, ${formatDateTime(unit.lastVotedAt)}`}. Dá para mudar até {formatDateTime(votingEndsAt)}.
      </span>
    </p>
  );
}

function BallotItem({
  item,
  chosenId,
  savedId,
  onChoose,
}: {
  item: AssemblyItemResponse;
  chosenId: number | undefined;
  savedId: number | undefined;
  onChoose: (optionId: number) => void;
}) {
  return (
    <li className="rounded-card bg-superficie p-5 shadow-whisper">
      <fieldset>
        <legend className="contents">
          <ItemHeading order={item.order} title={item.title} />
        </legend>
        {item.description && <p className="mt-2 whitespace-pre-line text-sm text-tinta-suave">{item.description}</p>}
        <div className="mt-4 flex flex-col gap-2">
          {item.options.map((option) => {
            const isSelected = option.id === chosenId;
            return (
              <label
                key={option.id}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-field px-4 py-2.5 text-[15px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde ${
                  isSelected ? "bg-verde-suave font-semibold text-verde-tinta" : option.isAbstention ? "bg-campo text-tinta-suave hover:bg-menu" : "bg-campo text-tinta hover:bg-menu"
                }`}
              >
                <input type="radio" name={`item-${item.id}`} className="sr-only" checked={isSelected} onChange={() => onChoose(option.id)} />
                <span
                  aria-hidden
                  className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${isSelected ? "border-verde-tinta" : "border-linha bg-superficie"}`}
                >
                  {isSelected && <span className="size-2.5 rounded-full bg-verde-tinta" />}
                </span>
                <span className="min-w-0 flex-1">{option.text}</span>
                {option.id === savedId && <span className="shrink-0 text-xs font-medium text-tinta-suave">seu voto</span>}
              </label>
            );
          })}
        </div>
      </fieldset>
      <ItemRules voteType={item.voteType} quorum={item.quorum} isSecret={item.isSecret} />
    </li>
  );
}
