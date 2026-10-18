import { useState, type FormEvent } from "react";
import { MessageSquareReply } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { formatDateTime } from "../../shared/lib/date";
import { RESPONSE_MAX, formatPlace, occurrenceStatuses, priorityMeta, typeLabel } from "../occurrences/occurrenceMeta";
import { PhotoThumb, StatusChip } from "../occurrences/OccurrenceParts";
import type { OccurrenceResponse, OccurrenceStatus } from "../occurrences/types";

type OccurrenceDetailsModalProps = {
  occurrence: OccurrenceResponse;
  showBuilding: boolean;
  errorMessage: string;
  busyAction: "status" | "response" | null;
  onClose: () => void;
  onChangeStatus: (status: OccurrenceStatus) => void;
  // Resolves true when the reply was saved.
  onRespond: (message: string) => Promise<boolean>;
};

export function OccurrenceDetailsModal({
  occurrence,
  showBuilding,
  errorMessage,
  busyAction,
  onClose,
  onChangeStatus,
  onRespond,
}: OccurrenceDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(!occurrence.managementResponse);
  const [draft, setDraft] = useState(occurrence.managementResponse ?? "");
  const [draftError, setDraftError] = useState("");
  const priority = priorityMeta(occurrence.priority);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message) {
      setDraftError("Escreva a resposta.");
      return;
    }

    if (await onRespond(message)) setIsEditing(false);
  }

  return (
    <Modal
      title={occurrence.title}
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusChip status={occurrence.status} />
          <span>{typeLabel(occurrence.type)}</span>
          <span aria-hidden>·</span>
          <span className={`font-semibold ${priority.tone}`}>Prioridade {priority.label.toLowerCase()}</span>
        </span>
      }
      size="lg"
      onClose={onClose}
      footer={
        <Button variant="quiet" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {errorMessage && (
        <p role="alert" className="mb-5 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}

      <p className="whitespace-pre-line text-[15px] leading-relaxed text-tinta">{occurrence.description}</p>

      {occurrence.photos.length > 0 && (
        <ul aria-label="Fotos" className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {occurrence.photos.map((photo, index) => (
            <PhotoThumb key={photo.id} photo={photo} index={index} />
          ))}
        </ul>
      )}

      <dl className="mt-5 divide-y divide-linha rounded-field bg-campo text-sm">
        {[
          { label: "Unidade", value: formatPlace(occurrence, showBuilding) },
          { label: "Aberta por", value: occurrence.createdByName || "-" },
          { label: "Aberta em", value: formatDateTime(occurrence.createdAt) },
          ...(occurrence.resolvedAt
            ? [
                {
                  label: "Resolvida em",
                  value: formatDateTime(occurrence.resolvedAt),
                },
              ]
            : []),
        ].map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="shrink-0 text-tinta-suave">{row.label}</dt>
            <dd className="min-w-0 truncate text-right font-medium tabular-nums text-tinta">{row.value}</dd>
          </div>
        ))}
      </dl>

      <fieldset className="mt-6" disabled={busyAction !== null}>
        <legend className="text-sm font-semibold text-tinta">Situação</legend>
        <div role="group" className="mt-2 grid grid-cols-2 gap-1 rounded-block bg-menu p-1 sm:grid-cols-4">
          {occurrenceStatuses.map((item) => {
            const isActive = item.value === occurrence.status;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => !isActive && onChangeStatus(item.value)}
                className={`rounded-field px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-progress ${
                  isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <section className="mt-6">
        {!isEditing && occurrence.managementResponse ? (
          <>
            <h3 className="text-sm font-semibold text-tinta">Resposta da gestão</h3>
            <div className="mt-2 rounded-field bg-verde-suave px-4 py-3">
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-verde-tinta">{occurrence.managementResponse}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px] text-verde-tinta/80">
                <span>
                  {occurrence.respondedByName || "Gestão"} · {formatDateTime(occurrence.respondedAt)}
                </span>
                <button type="button" onClick={() => setIsEditing(true)} className="font-semibold text-verde-tinta hover:underline">
                  Editar resposta
                </button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <TextAreaField
              label="Resposta da gestão"
              value={draft}
              maxLength={RESPONSE_MAX}
              rows={3}
              onChange={(event) => {
                setDraft(event.target.value);
                setDraftError("");
              }}
              placeholder="Ex.: Já chamamos o encanador. A visita está marcada para amanhã às 9h."
              hint={`${occurrence.createdByName || "Quem abriu"} recebe um aviso no sininho.`}
              error={draftError || undefined}
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {occurrence.managementResponse && (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    setDraft(occurrence.managementResponse ?? "");
                    setDraftError("");
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
              )}
              <Button type="submit" size="sm" isLoading={busyAction === "response"} loadingText="Enviando…" disabled={busyAction === "status"}>
                <MessageSquareReply size={16} strokeWidth={1.8} aria-hidden />
                {occurrence.managementResponse ? "Atualizar resposta" : "Enviar resposta"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </Modal>
  );
}
