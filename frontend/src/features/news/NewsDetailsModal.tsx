import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { formatDateTime } from "../../shared/lib/date";
import { NEWS_PRIORITY } from "./newsPriority";
import { getNewsUnread } from "./newsService";
import { groupUnreadByUnit, type UnreadUnit } from "./newsReads";
import { PriorityChip } from "./PriorityChip";
import type { NewsResponse } from "./types";

type NewsDetailsModalProps = {
  news: NewsResponse;
  // Who receives it, e.g. "para os administradores".
  audienceLabel: string;
  onClose: () => void;
  // Without these the notice is read-only (e.g. platform notices seen by an Admin).
  onEdit?: () => void;
  onDelete?: () => void;
};

export function NewsDetailsModal({ news, audienceLabel, onClose, onEdit, onDelete }: NewsDetailsModalProps) {
  const isImportant = news.priority === NEWS_PRIORITY.high;
  const canManage = Boolean(onEdit || onDelete);

  return (
    <Modal
      title={news.title}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <PriorityChip priority={news.priority} />
          <span>
            Publicado em {formatDateTime(news.createdAt)} · {audienceLabel}
          </span>
        </span>
      }
      leading={
        <span className={`grid size-11 place-items-center rounded-block ${isImportant ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"}`}>
          <Megaphone size={20} strokeWidth={1.8} aria-hidden />
        </span>
      }
      size="lg"
      onClose={onClose}
      footer={
        canManage ? (
          <>
            {onDelete && (
              <button type="button" onClick={onDelete} className="mr-auto rounded-full px-3 text-sm font-semibold text-vermelho hover:underline">
                Apagar aviso
              </button>
            )}
            {onEdit && <Button onClick={onEdit}>Editar aviso</Button>}
          </>
        ) : (
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
        )
      }
    >
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-tinta">{news.description}</p>
      {/* Counts only come to whoever manages notices; older notices have nobody on record. */}
      {(news.recipientCount ?? 0) > 0 && <NewsReads news={news} />}
    </Modal>
  );
}

type UnreadState = { units: UnreadUnit[]; error: string } | null;

// "8 de 12 leram" and who has not opened it yet, by unit (only name and unit).
function NewsReads({ news }: { news: NewsResponse }) {
  const total = news.recipientCount ?? 0;
  const read = Math.min(news.readCount ?? 0, total);
  const allRead = read >= total;
  const [unread, setUnread] = useState<UnreadState>(null);

  useEffect(() => {
    if (allRead) return;
    let isMounted = true;

    getNewsUnread(news.id)
      .then((people) => isMounted && setUnread({ units: groupUnreadByUnit(people), error: "" }))
      .catch((error) => isMounted && setUnread({ units: [], error: error instanceof Error ? error.message : "Não foi possível carregar quem não leu." }));

    return () => {
      isMounted = false;
    };
  }, [news.id, allRead]);

  return (
    <section aria-label="Leitura do aviso" className="mt-6 rounded-block bg-campo p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-tinta-suave">Leitura</h3>
        <p className="text-sm text-tinta">
          <span className="font-display text-lg font-bold tabular-nums">{read}</span>
          <span className="text-tinta-suave"> de {total} {total === 1 ? "avisado leu" : "avisados leram"}</span>
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-linha" aria-hidden>
        <div className="h-full rounded-full bg-verde" style={{ width: `${(read / total) * 100}%` }} />
      </div>

      {allRead ? (
        <p className="mt-3 text-sm text-verde-tinta">Todo mundo que recebeu já leu.</p>
      ) : !unread ? (
        <p className="mt-3 text-sm text-tinta-suave">Carregando quem ainda não leu…</p>
      ) : unread.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-vermelho">{unread.error}</p>
      ) : unread.units.length === 0 ? (
        <p className="mt-3 text-sm text-tinta-suave">Quem ainda não leu está fora dos prédios que você acompanha.</p>
      ) : (
        <>
          <h4 className="mt-4 text-[13px] font-semibold text-tinta-suave">Ainda não leram</h4>
          <ul className="mt-1.5 divide-y divide-linha">
            {unread.units.map((unit) => (
              <li key={unit.label} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <span className="shrink-0 text-sm font-semibold text-tinta sm:w-36">{unit.label}</span>
                <span className="min-w-0 text-sm text-tinta-suave">{unit.names.join(", ")}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
